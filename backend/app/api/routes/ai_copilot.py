"""
AI Copilot API Routes
- /ai/customer/chat         — Customer AI Rental Assistant (POST)
- /ai/customer/stream       — Streaming SSE version (GET)
- /ai/admin/chat            — Admin Fleet AI Copilot (POST)
- /ai/admin/stream          — Streaming SSE version (GET)
- /ai/admin/briefing        — Full fleet status briefing (GET)
- /ai/health                — Verify Ollama availability
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.customer_ai import answer_customer_query, stream_customer_query
from app.services.admin_ai import answer_admin_query, stream_admin_query, generate_fleet_briefing
from app.services.llm import get_available_model, OLLAMA_BASE
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Copilot"])


# ─── Schemas ────────────────────────────────────────────────

class CustomerChatRequest(BaseModel):
    query: str
    customer_id: Optional[str] = None


class AdminChatRequest(BaseModel):
    query: str
    category: Optional[str] = None
    region: Optional[str] = None


# ─── Health Check ────────────────────────────────────────────

@router.get("/health")
async def ai_health():
    """Check Ollama availability and model status."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                active_model = await get_available_model()
                return {
                    "status": "online",
                    "ollama_url": OLLAMA_BASE,
                    "available_models": models,
                    "active_model": active_model,
                }
    except Exception:
        pass
    return {
        "status": "offline",
        "ollama_url": OLLAMA_BASE,
        "available_models": [],
        "active_model": None,
        "message": "Ollama not reachable. Run: ollama serve",
    }


# ─── Customer AI ─────────────────────────────────────────────

@router.post("/customer/chat")
async def customer_chat(
    body: CustomerChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Customer AI Rental Assistant — non-streaming.
    Returns full answer grounded in real DB data.
    """
    # Use customer_id from token if not provided
    customer_id = body.customer_id or current_user.get("user_id")
    result = await answer_customer_query(
        db=db,
        query=body.query,
        customer_id=customer_id,
    )
    return result


@router.get("/customer/stream")
async def customer_stream(
    query: str = Query(..., description="Customer's question"),
    customer_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Customer AI Rental Assistant — Server-Sent Events streaming.
    Frontend should use EventSource or fetch with streaming reader.
    """
    cid = customer_id or current_user.get("user_id")
    return StreamingResponse(
        stream_customer_query(db=db, query=query, customer_id=cid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Admin Fleet AI ──────────────────────────────────────────

@router.post("/admin/chat")
async def admin_chat(
    body: AdminChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin Fleet AI Copilot — non-streaming.
    Requires admin or customer role (demo-friendly).
    """
    result = await answer_admin_query(
        db=db,
        query=body.query,
        category=body.category,
        region=body.region,
    )
    return result


@router.get("/admin/stream")
async def admin_stream(
    query: str = Query(..., description="Admin's fleet question"),
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Admin Fleet AI — streaming SSE."""
    return StreamingResponse(
        stream_admin_query(db=db, query=query, category=category, region=region),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/admin/briefing")
async def fleet_briefing(
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a comprehensive Fleet Status Briefing.
    Returns executive summary, critical issues, revenue, maintenance, and actions.
    """
    result = await generate_fleet_briefing(db=db, category=category, region=region)
    return result
