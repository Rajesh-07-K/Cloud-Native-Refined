from typing import TypedDict, Optional, List, Dict, Any


class QueryState(TypedDict):
    # Input
    question: str
    user_id: str
    user_role: str
    user_department: str

    # Set by Express (for STATUS queries)
    status_context: Optional[List[Dict[str, Any]]]

    # Set by query_classification_node
    query_type: str  # 'STATUS' | 'CONTENT_SEARCH'

    # Set by content_search_node
    search_results: List[Dict[str, Any]]

    # Set by answer generation nodes
    answer: str
    source_documents: List[Dict[str, Any]]
