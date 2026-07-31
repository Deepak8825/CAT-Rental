"""
Intent Classifier & Entity Extractor — Deterministic Query Intent Router
Classifies incoming user queries into focused domain intents and extracts filter entities.
"""
import re
import logging
from enum import Enum
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class QueryIntent(str, Enum):
    EQUIPMENT_INVENTORY = "EQUIPMENT_INVENTORY"
    CUSTOMER_RENTALS = "CUSTOMER_RENTALS"
    FLEET_SUMMARY = "FLEET_SUMMARY"
    REVENUE_ANALYTICS = "REVENUE_ANALYTICS"
    MAINTENANCE = "MAINTENANCE"
    TELEMETRY = "TELEMETRY"
    DEMAND_FORECAST = "DEMAND_FORECAST"
    PRICING = "PRICING"
    FLEET_BRIEFING = "FLEET_BRIEFING"
    GENERAL = "GENERAL"


# Known Equipment Categories in Caterpillar Platform
KNOWN_CATEGORIES = [
    "Excavator", "Loader", "Bulldozer", "Crane", 
    "Dump Truck", "Forklift", "Generator", "Compactor"
]

# Aliases for Category Matching
CATEGORY_ALIASES = {
    "excavator": "Excavator",
    "excavators": "Excavator",
    "loader": "Loader",
    "loaders": "Loader",
    "dozer": "Bulldozer",
    "dozers": "Bulldozer",
    "bulldozer": "Bulldozer",
    "bulldozers": "Bulldozer",
    "crane": "Crane",
    "cranes": "Crane",
    "dump truck": "Dump Truck",
    "dump trucks": "Dump Truck",
    "dumptruck": "Dump Truck",
    "forklift": "Forklift",
    "forklifts": "Forklift",
    "generator": "Generator",
    "generators": "Generator",
    "compactor": "Compactor",
    "compactors": "Compactor",
}


def classify_intent(query: str) -> Dict[str, Any]:
    """
    Classifies a query into a target intent and extracts filtering entities.
    """
    q_lower = query.lower().strip()
    
    # Extract Category Entity
    extracted_category = None
    for alias, canonical in CATEGORY_ALIASES.items():
        if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
            extracted_category = canonical
            break

    # Extract Equipment Model Entity (e.g., CAT 320, Komatsu PC200, Volvo EC220)
    model_match = re.search(r'\b(cat\s*\d+|cat\d+|komatsu\s*\w+|volvo\s*\w+|liebherr\s*\w+)\b', q_lower)
    extracted_model = None
    if model_match:
        raw_m = model_match.group(1).upper()
        # Standardize "CAT320" -> "CAT 320"
        extracted_model = re.sub(r'CAT(\d+)', r'CAT \1', raw_m)

    # 1. Executive Briefing
    if any(k in q_lower for k in ["executive briefing", "fleet briefing", "full report", "status briefing", "briefing report"]):
        return {
            "intent": QueryIntent.FLEET_BRIEFING,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 2. Maintenance Queries
    if any(k in q_lower for k in ["maintenance", "service", "repair", "overdue", "work order", "broken", "fix", "scheduled date"]):
        return {
            "intent": QueryIntent.MAINTENANCE,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 3. Telemetry & Sensor Queries
    if any(k in q_lower for k in ["telemetry", "sensor", "temperature", "pressure", "rpm", "fuel level", "overheat", "geofence", "anomalies"]):
        return {
            "intent": QueryIntent.TELEMETRY,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 4. Revenue & Financial Analytics
    if any(k in q_lower for k in ["revenue", "financial", "growth", "income", "spend", "cost summary", "month over month", "mom"]):
        return {
            "intent": QueryIntent.REVENUE_ANALYTICS,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 5. Customer Rentals & History
    if any(k in q_lower for k in ["my rental", "my active", "my history", "my booking", "my order", "my contract"]):
        return {
            "intent": QueryIntent.CUSTOMER_RENTALS,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 6. Demand Forecast & Prediction
    if any(k in q_lower for k in ["forecast", "predict demand", "future demand", "surge"]):
        return {
            "intent": QueryIntent.DEMAND_FORECAST,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 7. Dynamic Pricing Engine
    if any(k in q_lower for k in ["pricing engine", "dynamic pricing", "rate optimization"]):
        return {
            "intent": QueryIntent.PRICING,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 8. Equipment Inventory / Model Comparison / Highest Health
    if extracted_category or extracted_model or any(k in q_lower for k in [
        "available", "inventory", "catalog", "dozer", "excavator", "loader", "crane", 
        "highest health", "compare", "models", "rates", "daily rate"
    ]):
        return {
            "intent": QueryIntent.EQUIPMENT_INVENTORY,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 9. Fleet Summary & Overall Health
    if any(k in q_lower for k in ["fleet health", "fleet summary", "utilization rate", "fleet size", "total equipment"]):
        return {
            "intent": QueryIntent.FLEET_SUMMARY,
            "extracted_category": extracted_category,
            "extracted_model": extracted_model,
        }

    # 10. Default General Conversation
    return {
        "intent": QueryIntent.GENERAL,
        "extracted_category": extracted_category,
        "extracted_model": extracted_model,
    }
