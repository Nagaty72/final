"""
Health Analytics AI Service — FastAPI Application
==================================================
Serves prediction and AI chat endpoints for the
Health Analytics Platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import predict, chat

app = FastAPI(
    title="Health Analytics AI Service",
    version="1.0.0",
    description="AI-powered healthcare analytics and chatbot service",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend to reach the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(predict.router, prefix="/api/v1")
app.include_router(chat.router)


@app.get("/health")
def health_check():
    return {"status": "OK"}
