import re
from app.agents.query_state import QueryState
from app.services.vectorstore import query_documents
from app.services.llm import get_llm
from langchain_core.prompts import ChatPromptTemplate


def _clean_llm_output(text: str) -> str:
    """Strip <think>...</think> reasoning tokens produced by Qwen models."""
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    return cleaned.strip()



# ──────────────────────────────────────────────────────────────────────────────
# Node 1 — Query Classification
# ──────────────────────────────────────────────────────────────────────────────

def query_classification_node(state: QueryState) -> dict:
    """
    Classifies user question as STATUS or CONTENT_SEARCH using Groq.
    Falls back to CONTENT_SEARCH on any error to avoid unsafe status exposure.
    """
    question = state["question"]

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a query classifier for a document workflow system. "
                "Given a user question, decide if it is:\n"
                "- STATUS: the user is asking about the current status, location, reviewer, "
                "approval state, deadline, or progress of a specific document.\n"
                "- CONTENT_SEARCH: the user wants to find or browse documents by topic, type, or keywords.\n\n"
                "Reply with EXACTLY one word: STATUS or CONTENT_SEARCH. No other text."
            )
        ),
        ("human", "{question}")
    ])

    try:
        llm = get_llm()
        chain = prompt | llm
        result = chain.invoke({"question": question})
        raw = _clean_llm_output(result.content).upper()
        query_type = "STATUS" if "STATUS" in raw else "CONTENT_SEARCH"
        print(f"[QueryClassification] '{question[:60]}' -> {query_type}")
        return {"query_type": query_type}
    except Exception as e:
        print(f"[QueryClassification] Error: {e} — defaulting to CONTENT_SEARCH")
        return {"query_type": "CONTENT_SEARCH"}


# ──────────────────────────────────────────────────────────────────────────────
# Node 2 — Status Answer (uses Express-provided MongoDB context)
# ──────────────────────────────────────────────────────────────────────────────

def status_answer_node(state: QueryState) -> dict:
    """
    Generates a natural-language answer about document status.
    Uses status_context (doc data from MongoDB via Express) — never queries MongoDB directly.
    """
    question = state["question"]
    docs = state.get("status_context") or []

    if not docs:
        return {
            "answer": (
                "I couldn't find a document matching your query in the documents you are allowed to access. "
                "Please check the document title or unique ID and try again."
            ),
            "source_documents": []
        }

    # Build a readable context string from the MongoDB data
    context_parts = []
    source_documents = []

    for doc in docs:
        assigned_to = doc.get("assignedTo")
        if isinstance(assigned_to, dict):
            assigned_name = assigned_to.get("name", "Unknown")
            assigned_role = assigned_to.get("role", "")
            reviewer = f"{assigned_name} ({assigned_role})"
        else:
            reviewer = "Not yet assigned"

        current_holder = doc.get("currentHolder")
        if isinstance(current_holder, dict):
            holder_name = current_holder.get("name", "Unknown")
        else:
            holder_name = reviewer

        deadline = doc.get("deadline")
        deadline_str = deadline if deadline else "No deadline set"

        context_parts.append(
            f"Document: '{doc.get('title', 'Untitled')}'\n"
            f"  ID: {doc.get('uniqueId', 'N/A')}\n"
            f"  Status: {doc.get('status', 'unknown')}\n"
            f"  Currently reviewed by: {reviewer}\n"
            f"  Workflow step: {doc.get('workflowStep', 0)} of {doc.get('totalWorkflowSteps', 1)}\n"
            f"  Deadline: {deadline_str}\n"
            f"  Department: {doc.get('department', 'N/A')}"
        )

        source_documents.append({
            "unique_id": doc.get("uniqueId", ""),
            "title": doc.get("title", ""),
            "department": doc.get("department", ""),
            "document_type": doc.get("aiClassification", {}).get("documentType", "") if doc.get("aiClassification") else "",
            "relevance_score": None
        })

    context = "\n\n".join(context_parts)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a helpful assistant for a university document workflow system. "
                "Answer the user's question based ONLY on the provided document status data. "
                "Be concise and specific. Do not invent or assume any information not in the data. "
                "If the document is still pending, say so clearly. "
                "If fully approved, congratulate the user. "
                "If escalated, mention it clearly."
            )
        ),
        ("human", "Document status data:\n{context}\n\nUser question: {question}")
    ])

    try:
        llm = get_llm()
        chain = prompt | llm
        result = chain.invoke({"context": context, "question": question})
        answer = _clean_llm_output(result.content)
    except Exception as e:
        print(f"[StatusAnswer] LLM error: {e}")
        # Provide a safe templated answer if LLM fails
        first = docs[0]
        answer = (
            f"Your document '{first.get('title')}' is currently in status: "
            f"'{first.get('status')}'. "
            f"Workflow step: {first.get('workflowStep', 0)} of {first.get('totalWorkflowSteps', 1)}."
        )

    return {"answer": answer, "source_documents": source_documents}


# ──────────────────────────────────────────────────────────────────────────────
# Node 3 — Content Search (ChromaDB + Groq synthesis)
# ──────────────────────────────────────────────────────────────────────────────

def content_search_node(state: QueryState) -> dict:
    """
    Performs role-scoped semantic search via ChromaDB, then synthesizes answer with Groq.
    """
    question = state["question"]
    user_id = state["user_id"]
    user_role = state["user_role"]
    user_department = state["user_department"]

    hits = query_documents(
        query_text=question,
        user_role=user_role,
        user_department=user_department,
        user_id=user_id,
        top_k=5
    )

    if not hits:
        return {
            "answer": (
                "I couldn't find any documents matching your query in the documents you are allowed to access. "
                "Try a different search term or check your document library."
            ),
            "source_documents": [],
            "search_results": []
        }

    # Build context from ChromaDB hits
    context_lines = []
    for i, hit in enumerate(hits, 1):
        context_lines.append(
            f"{i}. '{hit['title']}' (ID: {hit['unique_id']}) — "
            f"Dept: {hit['department']}, Type: {hit['document_type']}, "
            f"Relevance: {hit.get('relevance_score', 'N/A')}"
        )
    context = "\n".join(context_lines)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a helpful document search assistant. "
                "Based on the search results below, answer the user's query. "
                "List the most relevant documents found. Be concise. "
                "If results are not highly relevant, say so honestly. "
                "Do not invent documents not in the list."
            )
        ),
        ("human", "Search results:\n{context}\n\nUser query: {question}")
    ])

    try:
        llm = get_llm()
        chain = prompt | llm
        result = chain.invoke({"context": context, "question": question})
        answer = _clean_llm_output(result.content)
    except Exception as e:
        print(f"[ContentSearch] LLM error: {e}")
        titles = ", ".join(h["title"] for h in hits)
        answer = f"Found {len(hits)} document(s) matching your query: {titles}."

    return {
        "answer": answer,
        "source_documents": hits,
        "search_results": hits
    }
