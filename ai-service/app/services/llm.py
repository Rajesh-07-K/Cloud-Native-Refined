from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.models.schemas import AIClassificationOutput, DepartmentEnum, UrgencyEnum

def get_llm():
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=0.0,
        max_retries=2
    )

def classify_document_text(text: str) -> AIClassificationOutput:
    """Classifies document text using ChatGroq with structured output."""
    llm = get_llm()
    # Use flat schema — Groq tool-calling works most reliably with flat models
    structured_llm = llm.with_structured_output(AIClassificationOutput)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a document classification AI for a university workflow system. "
                "Given the text of a scanned document, you must identify:\n"
                "1. document_type: what kind of document it is (e.g. 'Leave Application', "
                "'Fee Receipt', 'Bonafide Certificate', 'Project Report', 'NOC', etc.)\n"
                "2. suggested_department: EXACTLY one of these strings — "
                "Computer Science, Information Technology, Electronics, Mechanical, Civil, "
                "Mathematics, Physics, Chemistry, Administration, Library\n"
                "3. urgency: 'low', 'normal', or 'high'\n"
                "4. confidence: float 0.0-1.0\n"
                "5. extracted_metadata: dict with any useful fields found "
                "(name, student_id, date, roll_no, reason, duration, etc.)"
            )
        ),
        ("human", "Document Text:\n{text}")
    ])

    chain = prompt | structured_llm
    return chain.invoke({"text": text})

def get_fallback_classification() -> dict:
    """Fallback classification when LLM fails."""
    return {
        "classification": {
            "document_type": "Unknown",
            "suggested_department": "Administration",
            "urgency": UrgencyEnum.NORMAL.value,
            "confidence": 0.1
        },
        "extracted_metadata": {}
    }
