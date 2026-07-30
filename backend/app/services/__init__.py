"""
Services package init — exposes AI copilot services.
"""
from app.services.customer_ai import answer_customer_query, stream_customer_query
from app.services.admin_ai import answer_admin_query, stream_admin_query, generate_fleet_briefing

__all__ = [
    "answer_customer_query",
    "stream_customer_query",
    "answer_admin_query",
    "stream_admin_query",
    "generate_fleet_briefing",
]
