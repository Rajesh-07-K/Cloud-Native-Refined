import re
from app.agents.state import AgentState
from app.services.ocr import extract_text_from_file
from app.services.llm import classify_document_text, get_fallback_classification

def ocr_node(state: AgentState) -> dict:
    """Extracts text from the file."""
    text = extract_text_from_file(state["file_path"], state["mime_type"])
    
    # Check if OCR extracted enough text
    ocr_failed = len(text) < 20
    
    return {
        "extracted_text": text,
        "ocr_failed": ocr_failed
    }

def classify_node(state: AgentState) -> dict:
    """Classifies the document using LLM."""
    if state.get("ocr_failed"):
        # Skip LLM entirely — OCR didn't extract enough text
        print("[Classification] Skipped — OCR failed (text < 20 chars)")
        return get_fallback_classification()

    try:
        result = classify_document_text(state["extracted_text"])
        # result is now a flat AIClassificationOutput (no nested .classification)
        classification = {
            "document_type": result.document_type,
            "suggested_department": result.suggested_department,
            "urgency": result.urgency,
            "confidence": result.confidence,
        }
        print(f"[Classification] Success: {classification}")
        return {
            "classification": classification,
            "extracted_metadata": result.extracted_metadata
        }
    except Exception as e:
        print(f"[Classification Error] {type(e).__name__}: {str(e)}")
        return get_fallback_classification()

def validate_node(state: AgentState) -> dict:
    """Validates the extracted data and text."""
    classification = state.get("classification", {})
    metadata = state.get("extracted_metadata", {})
    text = state.get("extracted_text", "").lower()
    
    missing_fields = []
    issues = []
    
    if classification.get("document_type") == "Unknown":
        issues.append("Document could not be properly classified.")
        
    # Check for signature using simple keywords
    signature_keywords = ["signature", "signed", "sign here"]
    missing_signature = not any(kw in text for kw in signature_keywords)
    
    # Example logic: if it's an application, require a name
    doc_type = classification.get("document_type", "").lower()
    if "application" in doc_type and not metadata.get("name") and not metadata.get("student_name"):
        missing_fields.append("Name")
        
    is_valid = len(missing_fields) == 0 and not missing_signature
    
    if state.get("ocr_failed"):
        is_valid = False
        issues.append("OCR failed to extract sufficient text.")
    
    return {
        "validation": {
            "is_valid": is_valid,
            "missing_fields": missing_fields,
            "missing_signature": missing_signature,
            "issues": issues
        }
    }
