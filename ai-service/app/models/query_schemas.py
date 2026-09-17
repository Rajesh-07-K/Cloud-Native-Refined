from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class IndexRequest(BaseModel):
    """Request body for POST /intake/index"""
    document_id: str
    unique_id: str
    title: str
    description: str
    extracted_text: str
    document_type: str
    department: str
    uploaded_by: str


class IndexResponse(BaseModel):
    success: bool
    document_id: str
    message: str


class SourceDocument(BaseModel):
    unique_id: str
    title: str
    department: Optional[str] = ""
    document_type: Optional[str] = ""
    relevance_score: Optional[float] = None


class QueryRequest(BaseModel):
    """Request body for POST /query/ask"""
    question: str
    user_id: str
    user_role: str
    user_department: str
    # Optional: Express passes MongoDB doc data for STATUS queries
    status_context: Optional[List[Dict[str, Any]]] = None


class QueryResponse(BaseModel):
    answer: str
    source_documents: List[SourceDocument] = []
    query_type: Optional[str] = None
