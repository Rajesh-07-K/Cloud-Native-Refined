from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class DepartmentEnum(str, Enum):
    CS = 'Computer Science'
    IT = 'Information Technology'
    ECE = 'Electronics'
    MECH = 'Mechanical'
    CIVIL = 'Civil'
    MATH = 'Mathematics'
    PHY = 'Physics'
    CHEM = 'Chemistry'
    ADMIN = 'Administration'
    LIB = 'Library'

class UrgencyEnum(str, Enum):
    LOW = 'low'
    NORMAL = 'normal'
    HIGH = 'high'

# Flat schema — avoids nested Pydantic model issues with Groq tool-calling
class AIClassificationOutput(BaseModel):
    document_type: str = Field(description="The type of document (e.g. 'Leave Application', 'Fee Receipt', 'Project Report', 'Bonafide Certificate').")
    suggested_department: DepartmentEnum = Field(description="The department best suited to handle this document. Must be one of the exact values: Computer Science, Information Technology, Electronics, Mechanical, Civil, Mathematics, Physics, Chemistry, Administration, Library.")
    urgency: UrgencyEnum = Field(description="Urgency level: 'low', 'normal', or 'high'.")
    confidence: float = Field(description="Your confidence in this classification, between 0.0 and 1.0.", ge=0.0, le=1.0)
    extracted_metadata: Dict[str, Any] = Field(default_factory=dict, description="Key metadata extracted from the document such as name, student_id, date, reason, duration.")

class ValidationData(BaseModel):
    is_valid: bool
    missing_fields: List[str] = []
    missing_signature: bool = False
    issues: List[str] = []

class AnalyzeResponse(BaseModel):
    document_id: str
    extracted_text: str
    classification: dict
    extracted_metadata: dict
    validation: dict
    processing_time_ms: int
