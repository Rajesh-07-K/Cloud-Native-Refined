from typing import TypedDict, Optional, Dict, Any

class AgentState(TypedDict):
    document_id: str
    file_path: str
    mime_type: str
    
    # Populated by ocr_node
    extracted_text: str
    ocr_failed: bool
    
    # Populated by classify_node
    classification: Dict[str, Any]
    extracted_metadata: Dict[str, Any]
    
    # Populated by validate_node
    validation: Dict[str, Any]
    
    # Execution metrics
    start_time: float
    processing_time_ms: int
