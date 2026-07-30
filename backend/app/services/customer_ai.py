"""
Customer AI Rental Assistant
Provides grounded, hallucination-free rental guidance using real SQLite data.
Every response includes a "Data Sources Used" section.
"""
import json
import logging
from typing import Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.context_builder import build_customer_context
from app.services.llm import generate_response, generate_streaming

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Caterpillar Smart Rental AI Assistant — a helpful, professional, and factual rental advisor.

CRITICAL RULES:
1. NEVER invent equipment, prices, dates, availability, or specifications.
2. ONLY reference data provided to you in the context JSON below.
3. If information is not in the context, say "I don't have that data available right now."
4. Be concise, warm, and professional.
5. Always end your response with a "📊 Data Sources Used" section listing which data you referenced.
6. Format prices in USD with $ sign. Format dates clearly.
7. If a customer has active rentals, always acknowledge them.
8. Suggest real available equipment from the context — never invent names or prices.
"""

PROMPT_TEMPLATE = """Context Data (Real-time from database):
{context_json}

---
Customer Question: {query}

Instructions:
- Answer based ONLY on the context data above.
- If equipment is recommended, use actual names, models, and prices from the context.
- If the customer has rental history, personalize the response.
- End with:

📊 **Data Sources Used:**
[List each data source you actually referenced from the context]
"""


async def answer_customer_query(
    db: AsyncSession,
    query: str,
    customer_id: Optional[str] = None,
) -> dict:
    """
    Non-streaming customer AI response.
    Returns structured dict with answer and metadata.
    """
    context = await build_customer_context(db, customer_id, query)

    safe_ctx = _trim_context(context)
    prompt, system_prompt = build_prompt_for_intent(safe_ctx, query)

    response_text = await generate_response(
        prompt=prompt,
        system=system_prompt,
        temperature=0.1,
        max_tokens=800,
    )

    return {
        "answer": response_text,
        "data_sources": context.get("data_sources", []),
        "context_summary": _summarize_context(context),
        "customer_id": customer_id,
        "query": query,
    }


from app.services.prompt_builder import build_prompt_for_intent

async def stream_customer_query(
    db: AsyncSession,
    query: str,
    customer_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming customer AI response — yields Server-Sent Events.
    """
    context = await build_customer_context(db, customer_id, query)
    safe_ctx = _trim_context(context)
    prompt, system_prompt = build_prompt_for_intent(safe_ctx, query)

    # Yield metadata first as a special SSE event
    meta = json.dumps({
        "type": "metadata",
        "data_sources": context.get("data_sources", []),
        "context_summary": _summarize_context(context),
    })
    yield f"data: {meta}\n\n"

    # Stream token by token
    async for token in generate_streaming(prompt=prompt, system=system_prompt, temperature=0.1):
        chunk = json.dumps({"type": "token", "content": token})
        yield f"data: {chunk}\n\n"

    # Signal completion
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


def _trim_context(ctx: dict) -> dict:
    """Remove bulky fields to stay within token budget."""
    trimmed = dict(ctx)
    # Limit equipment list
    if len(trimmed.get("available_equipment", [])) > 6:
        trimmed["available_equipment"] = trimmed["available_equipment"][:6]
    # Limit history
    if len(trimmed.get("rental_history", [])) > 5:
        trimmed["rental_history"] = trimmed["rental_history"][:5]
    return trimmed


def _summarize_context(ctx: dict) -> dict:
    """Returns a brief summary of what data was loaded."""
    return {
        "intent": ctx.get("intent", "GENERAL"),
        "data_sources": ctx.get("data_sources", []),
        "has_customer_profile": ctx.get("customer") is not None,
        "active_rentals_count": len(ctx.get("active_rentals", [])),
        "available_equipment_count": len(ctx.get("available_equipment", [])),
    }
