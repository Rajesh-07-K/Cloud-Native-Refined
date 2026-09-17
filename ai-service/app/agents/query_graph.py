from langgraph.graph import StateGraph, START, END
from app.agents.query_state import QueryState
from app.agents.query_nodes import (
    query_classification_node,
    status_answer_node,
    content_search_node,
)


def route_after_classification(state: QueryState) -> str:
    """Route to the correct retrieval node based on query type."""
    return "status_answer_node" if state.get("query_type") == "STATUS" else "content_search_node"


def create_query_graph():
    workflow = StateGraph(QueryState)

    workflow.add_node("query_classification_node", query_classification_node)
    workflow.add_node("status_answer_node", status_answer_node)
    workflow.add_node("content_search_node", content_search_node)

    workflow.add_edge(START, "query_classification_node")

    workflow.add_conditional_edges(
        "query_classification_node",
        route_after_classification,
        {
            "status_answer_node": "status_answer_node",
            "content_search_node": "content_search_node"
        }
    )

    workflow.add_edge("status_answer_node", END)
    workflow.add_edge("content_search_node", END)

    return workflow.compile()


query_workflow = create_query_graph()
