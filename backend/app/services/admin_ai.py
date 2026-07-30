"""
Admin Fleet AI Copilot
Provides grounded fleet intelligence, maintenance triage, and demand insights.
All outputs are strictly grounded in real SQLite data — zero hallucination.
"""
import json
import logging
from typing import Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.context_builder import build_admin_fleet_context
from app.services.llm import generate_response, generate_streaming

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Caterpillar Fleet AI Copilot — a senior operations intelligence assistant for heavy equipment fleet management.

CRITICAL RULES:
1. NEVER invent fleet data, equipment names, revenue figures, or maintenance details.
2. ONLY reference data provided in the context JSON.
3. If data is unavailable, say "Insufficient data for this metric."
4. Provide actionable, prioritized insights ranked by business impact.
5. Use professional, executive-level language.
6. Always end with a "📊 Data Sources Used" section.
7. When citing revenue or counts, use exact numbers from context.
8. Flag critical issues (health < 50%, overdue maintenance, critical alerts) prominently.
"""

PROMPT_TEMPLATE = """Fleet Context Data (Real-time from database):
{context_json}

---
Admin Question / Request: {query}

Instructions:
- Analyze the context data and provide actionable fleet intelligence.
- Prioritize: (1) Safety/critical alerts, (2) Revenue impact, (3) Operational efficiency.
- Use specific numbers, equipment names, and dates from the context.
- Flag any critical issues at the top.
- Provide 2-3 specific recommended actions when relevant.
- End with:

📊 **Data Sources Used:**
[List each data source you actually referenced]
"""

FLEET_BRIEFING_PROMPT = """Fleet Context Data (Real-time from database):
{context_json}

---
Generate a comprehensive Fleet Status Briefing covering:
1. **Executive Summary** (2-3 sentences with key metrics)
2. **🚨 Critical Issues** (items requiring immediate attention)
3. **💰 Revenue Performance** (this month vs last month with % change)
4. **🔧 Maintenance Pipeline** (what's pending and why it matters)
5. **📈 Operational Highlights** (utilization, fleet health, top performers)
6. **✅ Recommended Actions** (3 specific, prioritized actions)

Use ONLY data from the context. Do not invent any figures.

📊 **Data Sources Used:**
[List each data source referenced]
"""


async def answer_admin_query(
    db: AsyncSession,
    query: str,
    category: Optional[str] = None,
    region: Optional[str] = None,
) -> dict:
    """Non-streaming admin AI response."""
    context = await build_admin_fleet_context(db, query, category, region)
    prompt, system_prompt = build_prompt_for_intent(context, query)

    response_text = await generate_response(
        prompt=prompt,
        system=system_prompt,
        temperature=0.1,
        max_tokens=900,
    )

    return {
        "answer": response_text,
        "data_sources": context.get("data_sources", []),
        "context_summary": _summarize_fleet_context(context),
        "query": query,
        "filter_category": category,
        "filter_region": region,
    }


async def generate_fleet_briefing(
    db: AsyncSession,
    category: Optional[str] = None,
    region: Optional[str] = None,
) -> dict:
    """Generate a full fleet status briefing (daily/on-demand)."""
    context = await build_admin_fleet_context(db, "fleet_briefing", category, region)
    context_json = json.dumps(context, indent=2, default=str)

    prompt = FLEET_BRIEFING_PROMPT.format(context_json=context_json)

    response_text = await generate_response(
        prompt=prompt,
        system=SYSTEM_PROMPT,
        temperature=0.1,
        max_tokens=1200,
    )

    return {
        "briefing": response_text,
        "data_sources": context.get("data_sources", []),
        "fleet_health": context.get("fleet_health", {}),
        "revenue_summary": context.get("revenue_summary", {}),
        "critical_equipment_count": len(context.get("critical_equipment", [])),
        "pending_maintenance_count": len(context.get("maintenance_alerts", [])),
        "unacknowledged_alerts_count": len(context.get("recent_anomalies", [])),
        "generated_at": context.get("timestamp"),
    }


from app.services.prompt_builder import build_prompt_for_intent

async def stream_admin_query(
    db: AsyncSession,
    query: str,
    category: Optional[str] = None,
    region: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Streaming admin AI response — yields SSE tokens."""
    context = await build_admin_fleet_context(db, query, category, region)
    prompt, system_prompt = build_prompt_for_intent(context, query)

    # Metadata event
    meta = json.dumps({
        "type": "metadata",
        "data_sources": context.get("data_sources", []),
        "context_summary": _summarize_fleet_context(context),
    })
    yield f"data: {meta}\n\n"

    async for token in generate_streaming(prompt=prompt, system=system_prompt, temperature=0.1):
        chunk = json.dumps({"type": "token", "content": token})
        yield f"data: {chunk}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


def _summarize_fleet_context(ctx: dict) -> dict:
    return {
        "intent": ctx.get("intent", "GENERAL"),
        "data_sources": ctx.get("data_sources", []),
        "filter_category": ctx.get("filter_category"),
        "equipment_count": len(ctx.get("equipment_list", [])),
        "maintenance_count": len(ctx.get("maintenance_alerts", [])),
        "anomalies_count": len(ctx.get("recent_anomalies", [])),
        "has_revenue_summary": "revenue_summary" in ctx.get("data_sources", []),
        "has_fleet_health": "fleet_health" in ctx.get("data_sources", []),
    }
