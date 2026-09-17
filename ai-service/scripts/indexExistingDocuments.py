"""
Backfill script: index existing MongoDB documents into ChromaDB.
Usage: python scripts/indexExistingDocuments.py

The script reads documents exported from the Express backend
via GET /api/admin/documents-export (or a local JSON file).

Pass a JSON file as argument:
  python scripts/indexExistingDocuments.py docs.json

Or configure EXPORT_FILE below.
"""

import sys
import os
import json
import requests

# Allow importing ai-service modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.vectorstore import upsert_document, collection_count

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8000")

def index_from_json(filepath: str):
    """Load exported documents JSON and upsert each into ChromaDB."""
    with open(filepath, "r", encoding="utf-8") as f:
        documents = json.load(f)

    if not isinstance(documents, list):
        documents = documents.get("documents", [])

    print(f"📂 Loaded {len(documents)} documents from {filepath}")
    success = 0
    failed = 0

    for doc in documents:
        doc_id = str(doc.get("_id", ""))
        if not doc_id:
            print(f"  ⚠️  Skipping doc with no _id")
            failed += 1
            continue

        # Read AI classification fields if available
        ai_class = doc.get("aiClassification") or {}
        document_type = ai_class.get("documentType", "Unknown")

        # Try extracted text from ai fields, fallback to empty
        extracted_text = doc.get("aiExtractedText", "") or ""

        ok = upsert_document(
            document_id=doc_id,
            unique_id=doc.get("uniqueId", doc_id),
            title=doc.get("title", "Untitled"),
            description=doc.get("description", ""),
            extracted_text=extracted_text,
            document_type=document_type,
            department=doc.get("department", ""),
            uploaded_by=str(doc.get("uploadedBy", ""))
        )
        if ok:
            success += 1
            print(f"  ✅ Indexed: {doc.get('title')} ({doc_id})")
        else:
            failed += 1
            print(f"  ❌ Failed:  {doc.get('title')} ({doc_id})")

    print(f"\n✅ Done — {success} indexed, {failed} failed")
    print(f"📊 ChromaDB collection size: {collection_count()}")


def index_via_api(docs_data: list):
    """Send documents to /intake/index endpoint."""
    success = 0
    failed = 0

    for doc in docs_data:
        doc_id = str(doc.get("_id", ""))
        ai_class = doc.get("aiClassification") or {}

        payload = {
            "document_id": doc_id,
            "unique_id": doc.get("uniqueId", doc_id),
            "title": doc.get("title", "Untitled"),
            "description": doc.get("description", ""),
            "extracted_text": doc.get("aiExtractedText", "") or "",
            "document_type": ai_class.get("documentType", "Unknown"),
            "department": doc.get("department", ""),
            "uploaded_by": str(doc.get("uploadedBy", ""))
        }

        try:
            r = requests.post(f"{AI_SERVICE_URL}/intake/index", json=payload, timeout=10)
            if r.status_code == 200 and r.json().get("success"):
                success += 1
                print(f"  ✅ {doc.get('title')}")
            else:
                failed += 1
                print(f"  ❌ {doc.get('title')}: {r.text[:100]}")
        except Exception as e:
            failed += 1
            print(f"  ❌ {doc.get('title')}: {e}")

    print(f"\n✅ Done — {success} indexed, {failed} failed")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        if not os.path.isfile(filepath):
            print(f"❌ File not found: {filepath}")
            sys.exit(1)
        index_from_json(filepath)
    else:
        print("Usage: python scripts/indexExistingDocuments.py <path-to-docs.json>")
        print("Export documents from Express: GET /api/admin/documents-export")
        print("Then run: python scripts/indexExistingDocuments.py exported_docs.json")
        sys.exit(0)
