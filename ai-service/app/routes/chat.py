"""
Chat Router
===========
POST /chat — receives a user message and returns an AI-generated
healthcare analytics response via Google Gemini.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.services.chat_service import generate_chat_response, generate_chat_title

router = APIRouter()

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    history: List[Dict[str, str]] = Field(default_factory=list)
    user_role: str = Field(default="normal_user")

class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    data_source: Optional[str] = None

class TitleRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)

class TitleResponse(BaseModel):
    title: str = Field(...)

# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat/title", response_model=TitleResponse)
async def chat_title(request: TitleRequest):
    """Generate a title from the first message."""
    try:
        title = await generate_chat_title(request.message)
        return TitleResponse(title=title)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI title error: {str(exc)}",
        )

# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Healthcare AI Chat endpoint.
    """
    try:
        ai_response = await generate_chat_response(request.message, request.history, request.user_role)
        return ChatResponse(response=ai_response)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(exc)}",
        )
