"""
Prompt Builder Layer — Dynamic, Intent-Specific Prompt Assembly.
Generates focused, intent-tailored prompts to ensure response formatting matches the user's specific intent.
"""
import json
import logging
from typing import Dict, Any, Optional
from app.services.intent_classifier import QueryIntent

logger = logging.getLogger(__name__)


# ─── System Prompts by Domain ─────────────────────────────────

SYSTEM_PROMPTS = {
    QueryIntent.EQUIPMENT_INVENTORY: """You are the Caterpillar Equipment Inventory Advisor.
Your job is to provide a clean, direct, concise listing of available equipment.

CRITICAL RULES:
1. NEVER include revenue, financial summaries, or maintenance reports unless specifically requested.
2. Present equipment clearly with Name, Model, Category, Health Score, and Daily Rate.
3. If specific items are requested (e.g., excavators), ONLY list those matching items.
4. Keep your answer brief, direct, and formatted cleanly.
5. End with:
📊 **Data Sources Used:**
[List data sources actually used]
""",

    QueryIntent.MAINTENANCE: """You are the Caterpillar Fleet Maintenance Specialist.
Your job is to report machine maintenance risks and service requirements.

CRITICAL RULES:
1. List each machine requiring service with: Machine Name, Category, Risk Level, Scheduled Date, Description, and Recommended Action.
2. Do NOT mention revenue or customer pricing unless requested.
3. Be concise, actionable, and safety-focused.
4. End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.TELEMETRY: """You are the Caterpillar IoT & Telemetry Engineer.
Your job is to present live sensor readings and critical machine events.

CRITICAL RULES:
1. Format telemetry data clearly with Machine Name, Coolant Temp, Engine RPM, Fuel Level, and Oil Pressure.
2. Highlight any unacknowledged alerts or anomalies.
3. Do NOT include financial or rental history details.
4. End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.REVENUE_ANALYTICS: """You are the Caterpillar Financial Operations Analyst.
Your job is to provide clear revenue metrics and trend comparisons.

CRITICAL RULES:
1. Present Current Month Revenue, Last Month Revenue, MoM % Change, and Active Rentals.
2. Do NOT list individual equipment specs or telemetry unless requested.
3. Keep the financial summary crisp and numerical.
4. End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.FLEET_SUMMARY: """You are the Caterpillar Fleet Operations Director.
Your job is to provide a high-level overview of fleet size, availability, and health.

CRITICAL RULES:
1. State Total Machines, Available Count, Rented Count, Maintenance Count, and Average Health Score.
2. Keep it high-level and brief.
3. End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.FLEET_BRIEFING: """You are the Caterpillar Senior Executive Fleet Operations Officer.
Your job is to generate a comprehensive, executive-grade Fleet Status Briefing.

REQUIRED STRUCTURE:
1. **Executive Summary** (2-3 sentences)
2. **🚨 Critical Issues & Risks**
3. **💰 Revenue & Financial Performance**
4. **🔧 Maintenance Pipeline**
5. **📈 Operational Metrics**
6. **✅ Recommended Executive Actions**

End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.CUSTOMER_RENTALS: """You are the Caterpillar Customer Account Advisor.
Your job is to answer questions about the customer's active rentals, contracts, and booking history.

CRITICAL RULES:
1. Address the customer directly and acknowledge active contracts.
2. Present equipment name, rental start/end dates, daily rate, and status.
3. End with:
📊 **Data Sources Used:**
[List data sources used]
""",

    QueryIntent.GENERAL: """You are the Caterpillar Smart Rental AI Assistant.
Provide a concise, helpful, and grounded response based ONLY on the context data.
End with:
📊 **Data Sources Used:**
[List data sources used]
""",
}


def build_prompt_for_intent(context: Dict[str, Any], query: str) -> tuple[str, str]:
    """
    Selects the intent-specific system prompt and constructs a tailored user prompt.
    Returns: (prompt_text, system_prompt_text)
    """
    intent_str = context.get("intent", QueryIntent.GENERAL.value)
    try:
        intent = QueryIntent(intent_str)
    except ValueError:
        intent = QueryIntent.GENERAL

    system_prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS[QueryIntent.GENERAL])
    context_json = json.dumps(context, indent=2, default=str)

    # Tailored Prompt Instructions based on Intent
    if intent == QueryIntent.EQUIPMENT_INVENTORY:
        user_prompt = f"""Equipment Inventory Context Data:
{context_json}

---
User Query: {query}

Instructions:
- Provide a direct, formatted list/table of matching available equipment.
- Include Name, Model, Category, Daily Rate ($), and Health Score.
- If a count is asked (e.g. "How many..."), state the exact count first.
- Do NOT include revenue, maintenance, or executive fleet metrics.
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    elif intent == QueryIntent.MAINTENANCE:
        user_prompt = f"""Maintenance Context Data:
{context_json}

---
User Query: {query}

Instructions:
- Present pending maintenance tasks clearly.
- Include Machine Name, Service Type, Scheduled Date, Health Score, and Description.
- Provide a concise 1-sentence recommended maintenance action for critical items.
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    elif intent == QueryIntent.TELEMETRY:
        user_prompt = f"""Telemetry & Event Context Data:
{context_json}

---
User Query: {query}

Instructions:
- Present live sensor readings and critical event alerts.
- Use a clear breakdown (Temperature, RPM, Fuel, Oil Pressure, Anomaly status).
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    elif intent == QueryIntent.REVENUE_ANALYTICS:
        user_prompt = f"""Revenue Context Data:
{context_json}

---
User Query: {query}

Instructions:
- State Current Month Revenue, Last Month Revenue, and Month-over-Month % Change.
- Mention active rental contract count.
- Keep the response short and metric-focused.
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    elif intent == QueryIntent.FLEET_BRIEFING:
        user_prompt = f"""Comprehensive Fleet Context Data:
{context_json}

---
User Request: {query}

Instructions:
- Generate a full executive status briefing following the required 6-part executive structure.
- Cite exact figures for revenue, health scores, and critical equipment count.
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    else:
        user_prompt = f"""Context Data:
{context_json}

---
User Query: {query}

Instructions:
- Answer directly based ONLY on the context data above.
- Be concise and factual.
- End with:

📊 **Data Sources Used:**
{_format_sources(context)}
"""

    return user_prompt, system_prompt


def _format_sources(ctx: dict) -> str:
    sources = ctx.get("data_sources", [])
    if not sources:
        return "- SQLite Database"
    labels = {
        "equipment_catalog": "Equipment Catalog",
        "maintenance_records": "Maintenance Records",
        "revenue_summary": "Revenue Summary",
        "fleet_health": "Fleet Health",
        "live_telemetry": "Live Telemetry",
        "event_alerts": "Event Alerts",
        "active_rentals": "Active Rentals",
        "customer_profile": "Customer Profile",
    }
    return "\n".join(f"- {labels.get(s, s)}" for s in sources)
