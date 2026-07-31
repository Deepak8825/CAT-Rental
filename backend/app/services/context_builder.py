"""
Context Builder — Dynamic, Intent-Driven SQLite Retrieval Engine.
Queries ONLY the database tables required for the user's classified intent.
Zero unnecessary prompts • Dynamic data sources • Ultra-low latency.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, or_
from uuid import UUID

from app.models.models import (
    Equipment, Rental, Customer, SensorReading,
    MaintenanceRecord, Event, DailyLog, Feedback,
    EquipmentStatus, RentalStatus, EventSeverity
)
from app.services.intent_classifier import classify_intent, QueryIntent

logger = logging.getLogger(__name__)


# ─── Customer Context (Dynamic Intent-Driven) ────────────────

async def build_customer_context(
    db: AsyncSession,
    customer_id: Optional[str],
    query: str,
) -> dict:
    """
    Dynamically builds customer context based on classified intent.
    Queries ONLY relevant SQLite tables.
    """
    classification = classify_intent(query)
    intent = classification["intent"]
    detected_category = classification["extracted_category"]
    detected_model = classification["extracted_model"]

    ctx = {
        "query": query,
        "intent": intent.value,
        "timestamp": datetime.utcnow().isoformat(),
        "data_sources": [],
    }

    # 1. Customer Profile (loaded if customer_id is provided & relevant)
    if customer_id and intent in [QueryIntent.CUSTOMER_RENTALS, QueryIntent.GENERAL]:
        try:
            cust = await db.execute(
                select(Customer).where(Customer.id == UUID(customer_id))
            )
            cust = cust.scalar_one_or_none()
            if cust:
                ctx["customer"] = {
                    "id": str(cust.id),
                    "name": cust.name,
                    "company": cust.company,
                    "email": cust.email,
                    "credit_score": cust.credit_score,
                    "total_rentals": cust.total_rentals,
                    "total_spend": float(cust.total_spend or 0),
                    "preferred_category": cust.preferred_category,
                }
                ctx["data_sources"].append("customer_profile")
        except Exception as e:
            logger.warning(f"Customer fetch error: {e}")

    # 2. Active Rentals / Rental History Intent
    if customer_id and intent in [QueryIntent.CUSTOMER_RENTALS, QueryIntent.GENERAL]:
        try:
            active = await db.execute(
                select(Rental, Equipment)
                .join(Equipment, Rental.equipment_id == Equipment.id)
                .where(Rental.customer_id == UUID(customer_id))
                .order_by(desc(Rental.start_date))
                .limit(5)
            )
            rows = active.all()
            active_rentals = []
            for rental, equip in rows:
                active_rentals.append({
                    "rental_id": str(rental.id),
                    "equipment_name": equip.name,
                    "category": equip.category,
                    "start_date": rental.start_date.isoformat() if rental.start_date else None,
                    "end_date": rental.end_date.isoformat() if rental.end_date else None,
                    "daily_rate": float(rental.daily_rate or 0),
                    "total_cost": float(rental.total_cost or 0),
                    "status": rental.status.value if hasattr(rental.status, 'value') else str(rental.status),
                })
            ctx["active_rentals"] = active_rentals
            if active_rentals:
                ctx["data_sources"].append("active_rentals")
        except Exception as e:
            logger.warning(f"Active rentals fetch error: {e}")

    # 3. Equipment Inventory / Search Intent
    if intent in [QueryIntent.EQUIPMENT_INVENTORY, QueryIntent.PRICING, QueryIntent.GENERAL]:
        try:
            stmt = select(Equipment).where(Equipment.status == EquipmentStatus.AVAILABLE)
            
            if detected_category:
                stmt = stmt.where(Equipment.category == detected_category)
            
            if detected_model:
                stmt = stmt.where(
                    or_(
                        Equipment.name.ilike(f"%{detected_model}%"),
                        Equipment.model.ilike(f"%{detected_model}%")
                    )
                )

            stmt = stmt.order_by(desc(Equipment.health_score)).limit(10)
            avail = await db.execute(stmt)
            
            available_equipment = []
            for eq in avail.scalars():
                available_equipment.append({
                    "id": str(eq.id),
                    "name": eq.name,
                    "model": eq.model,
                    "category": eq.category,
                    "health_score": eq.health_score,
                    "daily_rate": float(eq.daily_rate or 0),
                    "weekly_rate": round(float(eq.daily_rate or 0) * 6, 2),
                })
            ctx["available_equipment"] = available_equipment
            if available_equipment:
                ctx["data_sources"].append("equipment_catalog")
        except Exception as e:
            logger.warning(f"Equipment fetch error: {e}")

    # 4. Fleet Summary Intent
    if intent in [QueryIntent.FLEET_SUMMARY]:
        try:
            total = await db.execute(select(func.count(Equipment.id)))
            available = await db.execute(
                select(func.count(Equipment.id)).where(Equipment.status == EquipmentStatus.AVAILABLE)
            )
            avg_health = await db.execute(select(func.avg(Equipment.health_score)))
            ctx["fleet_summary"] = {
                "total_equipment": total.scalar() or 0,
                "available_count": available.scalar() or 0,
                "avg_health_score": round(float(avg_health.scalar() or 0), 1),
            }
            ctx["data_sources"].append("fleet_summary")
        except Exception as e:
            logger.warning(f"Fleet summary error: {e}")

    return ctx


# ─── Admin Fleet Context (Dynamic Intent-Driven) ──────────────

async def build_admin_fleet_context(
    db: AsyncSession,
    query: str,
    category: Optional[str] = None,
    region: Optional[str] = None,
) -> dict:
    """
    Dynamically builds admin fleet context based on classified intent.
    Executes ONLY database queries matching the user's intent.
    """
    classification = classify_intent(query)
    intent = classification["intent"]
    detected_category = category or classification["extracted_category"]
    detected_model = classification["extracted_model"]

    ctx = {
        "query": query,
        "intent": intent.value,
        "timestamp": datetime.utcnow().isoformat(),
        "filter_category": detected_category,
        "filter_region": region,
        "data_sources": [],
    }

    is_briefing = (intent == QueryIntent.FLEET_BRIEFING)

    # 1. Fleet Health Summary (For FLEET_SUMMARY or FLEET_BRIEFING)
    if is_briefing or intent == QueryIntent.FLEET_SUMMARY:
        try:
            total_res = await db.execute(select(func.count(Equipment.id)))
            avail_res = await db.execute(select(func.count(Equipment.id)).where(Equipment.status == EquipmentStatus.AVAILABLE))
            rented_res = await db.execute(select(func.count(Equipment.id)).where(Equipment.status == EquipmentStatus.RENTED))
            maint_res = await db.execute(select(func.count(Equipment.id)).where(Equipment.status == EquipmentStatus.MAINTENANCE))
            avg_h_res = await db.execute(select(func.avg(Equipment.health_score)))

            tot_val = total_res.scalar() or 0
            av_val = avail_res.scalar() or 0
            rt_val = rented_res.scalar() or 0
            mt_val = maint_res.scalar() or 0
            h_val = float(avg_h_res.scalar() or 0)

            ctx["fleet_health"] = {
                "total": tot_val,
                "avg_health_score": round(h_val, 1),
                "available": av_val,
                "rented": rt_val,
                "maintenance": mt_val,
                "utilization_rate": round((rt_val / max(tot_val, 1)) * 100, 1),
            }
            ctx["data_sources"].append("fleet_health")
        except Exception as e:
            logger.warning(f"Fleet health error: {e}")

    # 2. Revenue Summary (For REVENUE_ANALYTICS or FLEET_BRIEFING)
    if is_briefing or intent == QueryIntent.REVENUE_ANALYTICS:
        try:
            today = date.today()
            this_month = today.replace(day=1)
            last_month = (this_month - timedelta(days=1)).replace(day=1)

            rev_this = await db.execute(
                select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
                    and_(Rental.start_date >= this_month, Rental.status != RentalStatus.CANCELLED)
                )
            )
            rev_last = await db.execute(
                select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
                    and_(Rental.start_date >= last_month, Rental.start_date < this_month, Rental.status != RentalStatus.CANCELLED)
                )
            )
            active_count = await db.execute(
                select(func.count(Rental.id)).where(Rental.status == RentalStatus.ACTIVE)
            )
            
            rv = float(rev_this.scalar() or 0)
            rl = float(rev_last.scalar() or 0)
            ctx["revenue_summary"] = {
                "current_month_revenue": rv,
                "last_month_revenue": rl,
                "month_over_month_change_pct": round(((rv - rl) / max(rl, 1)) * 100, 1),
                "active_rentals": active_count.scalar() or 0,
            }
            ctx["data_sources"].append("revenue_summary")
        except Exception as e:
            logger.warning(f"Revenue summary error: {e}")

    # 3. Maintenance Records (For MAINTENANCE or FLEET_BRIEFING)
    if is_briefing or intent == QueryIntent.MAINTENANCE:
        try:
            maint_stmt = (
                select(MaintenanceRecord, Equipment)
                .join(Equipment, MaintenanceRecord.equipment_id == Equipment.id)
                .where(MaintenanceRecord.is_completed == False)
            )
            if detected_category:
                maint_stmt = maint_stmt.where(Equipment.category == detected_category)

            maint_stmt = maint_stmt.order_by(desc(MaintenanceRecord.scheduled_date)).limit(10)
            maint = await db.execute(maint_stmt)
            
            maintenance_alerts = []
            for rec, equip in maint.all():
                maintenance_alerts.append({
                    "equipment_name": equip.name,
                    "category": equip.category,
                    "maintenance_type": rec.maintenance_type.value if hasattr(rec.maintenance_type, 'value') else str(rec.maintenance_type),
                    "scheduled_date": rec.scheduled_date.isoformat() if rec.scheduled_date else None,
                    "description": rec.description,
                    "estimated_cost": float(rec.cost or 0),
                    "health_score": equip.health_score,
                })
            ctx["maintenance_alerts"] = maintenance_alerts
            if maintenance_alerts:
                ctx["data_sources"].append("maintenance_records")
        except Exception as e:
            logger.warning(f"Maintenance fetch error: {e}")

    # 4. Telemetry & Sensor Readings (For TELEMETRY or FLEET_BRIEFING)
    if is_briefing or intent == QueryIntent.TELEMETRY:
        try:
            evts = await db.execute(
                select(Event, Equipment)
                .join(Equipment, Event.equipment_id == Equipment.id, isouter=True)
                .where(Event.is_acknowledged == False)
                .order_by(desc(Event.event_time))
                .limit(8)
            )
            recent_anomalies = []
            for evt, equip in evts.all():
                recent_anomalies.append({
                    "title": evt.title,
                    "severity": evt.severity.value if hasattr(evt.severity, 'value') else str(evt.severity),
                    "equipment_name": equip.name if equip else "Unknown",
                    "event_time": evt.event_time.isoformat() if evt.event_time else None,
                    "description": evt.description,
                })
            ctx["recent_anomalies"] = recent_anomalies
            if recent_anomalies:
                ctx["data_sources"].append("event_alerts")

            sensor_q = (
                select(SensorReading, Equipment)
                .join(Equipment, SensorReading.equipment_id == Equipment.id)
            )
            if detected_model:
                sensor_q = sensor_q.where(Equipment.name.ilike(f"%{detected_model}%"))
            elif detected_category:
                sensor_q = sensor_q.where(Equipment.category == detected_category)

            sensor_q = sensor_q.order_by(desc(SensorReading.reading_time)).limit(5)
            sensors = await db.execute(sensor_q)
            telemetry_snapshot = []
            for reading, equip in sensors.all():
                telemetry_snapshot.append({
                    "equipment_name": equip.name,
                    "temperature": reading.coolant_temp,
                    "fuel_level": reading.fuel_level,
                    "engine_rpm": reading.rpm,
                    "oil_pressure": reading.oil_pressure,
                    "timestamp": reading.reading_time.isoformat() if reading.reading_time else None,
                })
            ctx["telemetry_snapshot"] = telemetry_snapshot
            if telemetry_snapshot:
                ctx["data_sources"].append("live_telemetry")
        except Exception as e:
            logger.warning(f"Telemetry fetch error: {e}")

    # 5. Equipment Inventory / Catalog (For EQUIPMENT_INVENTORY, PRICING, or FLEET_BRIEFING)
    if is_briefing or intent in [QueryIntent.EQUIPMENT_INVENTORY, QueryIntent.PRICING, QueryIntent.DEMAND_FORECAST]:
        try:
            eq_stmt = select(Equipment)
            if detected_category:
                eq_stmt = eq_stmt.where(Equipment.category == detected_category)
            if detected_model:
                eq_stmt = eq_stmt.where(
                    or_(
                        Equipment.name.ilike(f"%{detected_model}%"),
                        Equipment.model.ilike(f"%{detected_model}%")
                    )
                )
            
            eq_stmt = eq_stmt.order_by(desc(Equipment.health_score)).limit(10)
            equip_res = await db.execute(eq_stmt)
            
            equipment_list = []
            for eq in equip_res.scalars():
                equipment_list.append({
                    "name": eq.name,
                    "model": eq.model,
                    "category": eq.category,
                    "health_score": eq.health_score,
                    "status": eq.status.value if hasattr(eq.status, 'value') else str(eq.status),
                    "daily_rate": float(eq.daily_rate or 0),
                    "weekly_rate": round(float(eq.daily_rate or 0) * 6, 2),
                    "monthly_rate": round(float(eq.daily_rate or 0) * 22, 2),
                })
            ctx["equipment_list"] = equipment_list
            if equipment_list:
                ctx["data_sources"].append("equipment_catalog")
        except Exception as e:
            logger.warning(f"Equipment inventory error: {e}")

    return ctx
