import os
import chromadb
from chromadb.utils import embedding_functions

# Persistent ChromaDB stored next to the ai-service root
CHROMA_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "chroma_db")
CHROMA_DB_PATH = os.path.abspath(CHROMA_DB_PATH)
COLLECTION_NAME = "docflow_documents"

_client = None
_collection = None

def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    os.makedirs(CHROMA_DB_PATH, exist_ok=True)
    _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

    # Use local sentence-transformers embedding — no paid API needed
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )
    return _collection


def upsert_document(
    document_id: str,
    unique_id: str,
    title: str,
    description: str,
    extracted_text: str,
    document_type: str,
    department: str,
    uploaded_by: str
) -> bool:
    """
    Upsert a document into ChromaDB.
    Returns True on success, False on failure.
    Failure is logged but never raised to the caller.
    """
    try:
        collection = _get_collection()

        # Build searchable text: title + description + extracted OCR text
        searchable_text = f"{title}\n{description}\n{extracted_text}".strip()
        if not searchable_text:
            searchable_text = title or unique_id

        collection.upsert(
            ids=[document_id],
            documents=[searchable_text],
            metadatas=[{
                "document_id": document_id,
                "unique_id": unique_id,
                "title": title,
                "description": description,
                "document_type": document_type,
                "department": department,
                "uploaded_by": uploaded_by
            }]
        )
        print(f"[VectorStore] Upserted document {document_id} ({unique_id})")
        return True
    except Exception as e:
        print(f"[VectorStore] Error upserting {document_id}: {e}")
        return False


def query_documents(
    query_text: str,
    user_role: str,
    user_department: str,
    user_id: str,
    top_k: int = 5
) -> list:
    """
    Semantic search in ChromaDB with role-based metadata filtering.
    Returns list of matching document metadata dicts.
    Never raises — returns [] on failure.
    """
    try:
        collection = _get_collection()

        # Build metadata filter based on role
        where_filter = None
        if user_role == "student":
            where_filter = {"uploaded_by": {"$eq": user_id}}
        elif user_role in ("mentor", "hod"):
            where_filter = {"department": {"$eq": user_department}}
        # administration: no filter — can see all

        query_kwargs = {
            "query_texts": [query_text],
            "n_results": top_k,
            "include": ["metadatas", "distances", "documents"]
        }
        if where_filter:
            query_kwargs["where"] = where_filter

        results = collection.query(**query_kwargs)

        hits = []
        if results and results.get("metadatas"):
            for meta, dist in zip(results["metadatas"][0], results["distances"][0]):
                hits.append({
                    "unique_id": meta.get("unique_id", ""),
                    "title": meta.get("title", ""),
                    "department": meta.get("department", ""),
                    "document_type": meta.get("document_type", ""),
                    "relevance_score": round(1 - dist, 3)
                })
        return hits
    except Exception as e:
        print(f"[VectorStore] Query error: {e}")
        return []


def collection_count() -> int:
    """Return number of documents in the collection."""
    try:
        return _get_collection().count()
    except Exception as e:
        print(f"[VectorStore] Count error: {e}")
        return 0
