from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.nodes import ocr_node, classify_node, validate_node

def route_after_ocr(state: AgentState):
    """Route based on OCR success."""
    if state.get("ocr_failed"):
        return "validate_node" # Skip classification, go to validation directly
    return "classify_node"

def create_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("ocr_node", ocr_node)
    workflow.add_node("classify_node", classify_node)
    workflow.add_node("validate_node", validate_node)
    
    workflow.add_edge(START, "ocr_node")
    
    workflow.add_conditional_edges(
        "ocr_node",
        route_after_ocr,
        {
            "classify_node": "classify_node",
            "validate_node": "validate_node"
        }
    )
    
    workflow.add_edge("classify_node", "validate_node")
    workflow.add_edge("validate_node", END)
    
    return workflow.compile()

document_workflow = create_graph()
