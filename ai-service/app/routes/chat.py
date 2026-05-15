"""
Chat Router
===========
POST /chat — receives a user message and returns an AI-generated
healthcare analytics response via Google Gemini.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.chat_service import generate_chat_response

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """Incoming chat message from the frontend."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The user's question or message (Arabic or English).",
        examples=["What are the top diseases in Cairo?"],
    )
    history: list = Field(
        default=[],
        description="List of previous messages in the conversation for context.",
    )


class ChatResponse(BaseModel):
    """AI-generated response sent back to the frontend."""
    response: str = Field(
        ...,
        description="The AI assistant's reply.",
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Healthcare AI Chat endpoint.

    Accepts a user message and returns an AI-powered response
    tailored for healthcare analytics and decision support.
    """
    try:
        ai_response = await generate_chat_response(request.message, request.history)
        return ChatResponse(response=ai_response)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(exc)}",
        )
