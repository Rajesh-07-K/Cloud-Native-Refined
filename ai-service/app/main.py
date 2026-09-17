import os
import time
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import AnalyzeResponse
from app.models.query_schemas import IndexRequest, IndexResponse, QueryRequest, QueryResponse, SourceDocument
from app.agents.graph import document_workflow
from app.agents.query_graph import query_workflow
from app.services.llm import get_fallback_classification
from app.services.vectorstore import upsert_document

app = FastAPI(title="Document AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/intake/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    document_id: str = Form(...),
    file: UploadFile = File(...)
):
    start_time = time.time()
    
    # Save file temporarily for processing
    file_path = os.path.join(TEMP_DIR, f"{document_id}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        mime_type = file.content_type
        if "pdf" not in mime_type and "image" not in mime_type:
            raise HTTPException(status_code=422, detail="Unsupported file format")

        # Initialize State
        initial_state = {
            "document_id": document_id,
            "file_path": file_path,
            "mime_type": mime_type,
            "start_time": start_time
        }
        
        # Execute LangGraph Workflow
        result = document_workflow.invoke(initial_state)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # In case classification was skipped due to OCR failure
        classification_data = result.get("classification")
        extracted_metadata = result.get("extracted_metadata")
        
        if not classification_data:
            fallback = get_fallback_classification()
            classification_data = fallback["classification"]
            extracted_metadata = fallback["extracted_metadata"]

        return {
            "document_id": document_id,
            "extracted_text": result.get("extracted_text", ""),
            "classification": classification_data,
            "extracted_metadata": extracted_metadata,
            "validation": result.get("validation", {}),
            "processing_time_ms": processing_time_ms
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error processing {document_id}: {str(e)}")
        # Graceful fallback on overall failure
        processing_time_ms = int((time.time() - start_time) * 1000)
        fallback = get_fallback_classification()
        return {
            "document_id": document_id,
            "extracted_text": "",
            "classification": fallback["classification"],
            "extracted_metadata": fallback["extracted_metadata"],
            "validation": {
                "is_valid": False,
                "missing_fields": [],
                "missing_signature": False,
                "issues": [f"Processing error: {str(e)}"]
            },
            "processing_time_ms": processing_time_ms
        }
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)


# ─────────────────────────────────────────────────────────────
# Phase 3 — ChromaDB Indexing Endpoint
# ─────────────────────────────────────────────────────────────

@app.post("/intake/index", response_model=IndexResponse)
async def index_document(req: IndexRequest):
    """
    Index a document into ChromaDB after Phase 1 processing.
    Called by Express in the fire-and-forget block.
    Never makes document upload fail — always returns 200.
    """
    success = upsert_document(
        document_id=req.document_id,
        unique_id=req.unique_id,
        title=req.title,
        description=req.description,
        extracted_text=req.extracted_text,
        document_type=req.document_type,
        department=req.department,
        uploaded_by=req.uploaded_by
    )
    msg = "Indexed successfully" if success else "Indexing failed (non-fatal — check logs)"
    return IndexResponse(success=success, document_id=req.document_id, message=msg)


# ─────────────────────────────────────────────────────────────
# Phase 3 — Query Agent Endpoint
# ─────────────────────────────────────────────────────────────

@app.post("/query/ask", response_model=QueryResponse)
async def query_ask(req: QueryRequest):
    """
    Main Phase 3 query endpoint.
    Accepts question + authenticated user context from Express.
    Returns natural-language answer + source documents.
    """
    try:
        initial_state = {
            "question": req.question,
            "user_id": req.user_id,
            "user_role": req.user_role,
            "user_department": req.user_department,
            "status_context": req.status_context or [],
            "query_type": "",
            "search_results": [],
            "answer": "",
            "source_documents": []
        }
        result = query_workflow.invoke(initial_state)
        source_docs = [
            SourceDocument(**doc) if isinstance(doc, dict) else doc
            for doc in (result.get("source_documents") or [])
        ]
        return QueryResponse(
            answer=result.get("answer", "I was unable to process your question."),
            source_documents=source_docs,
            query_type=result.get("query_type", "UNKNOWN")
        )
    except Exception as e:
        print(f"[QueryAsk] Unhandled error: {e}")
        return QueryResponse(
            answer="I'm unable to process your question right now. Please try again later.",
            source_documents=[]
        )


@app.get("/health")
async def health():
    return {"status": "OK", "service": "DocFlow AI Service"}
