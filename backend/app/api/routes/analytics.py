"""
Analytics & AI API routes — ML predictions, recommendations, and dashboards.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.models.models import (
    Equipment, Rental, Customer, DailyLog, SensorReading, 
    Event, MaintenanceRecord, Feedback, RentalStatus, EquipmentStatus
)
from app.models.schemas import (
    DemandForecast, PricingRecommendation, JobFitRecommendation,
    DashboardSummary, CustomerStats
)

router = APIRouter(prefix="/analytics", tags=["Analytics & AI"])


@router.get("/dashboard")
async def admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Comprehensive admin dashboard data."""
    today = date.today()
    this_month = today.replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    
    # Equipment stats
    equip_total = await db.execute(select(func.count(Equipment.id)))
    equip_available = await db.execute(
        select(func.count(Equipment.id)).where(Equipment.status == EquipmentStatus.AVAILABLE)
    )
    
    # Rental stats
    active_rentals = await db.execute(
        select(func.count(Rental.id)).where(Rental.status == RentalStatus.ACTIVE)
    )
    
    # Customer stats
    total_customers = await db.execute(select(func.count(Customer.id)))
    
    # Revenue
    rev_this = await db.execute(
        select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
            and_(Rental.start_date >= this_month, Rental.status != RentalStatus.CANCELLED)
        )
    )
    rev_last = await db.execute(
        select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
            and_(Rental.start_date >= last_month, Rental.start_date < this_month,
                 Rental.status != RentalStatus.CANCELLED)
        )
    )
    
    rev_this_val = float(rev_this.scalar() or 0)
    rev_last_val = float(rev_last.scalar() or 0)
    rev_change = ((rev_this_val - rev_last_val) / max(rev_last_val, 1)) * 100
    
    # Average utilization (from daily logs)
    util = await db.execute(
        select(
            func.avg(DailyLog.operating_hours / 
                     func.nullif(DailyLog.operating_hours + DailyLog.idle_hours, 0) * 100)
        )
    )
    
    # Pending maintenance
    pending_maint = await db.execute(
        select(func.count(MaintenanceRecord.id)).where(
            MaintenanceRecord.is_completed == False
        )
    )
    
    # Active alerts
    active_alerts = await db.execute(
        select(func.count(Event.id)).where(Event.is_acknowledged == False)
    )
    
    # Top categories
    cat_query = select(
        Equipment.category,
        func.count(Equipment.id).label("count"),
        func.avg(Equipment.health_score).label("avg_health"),
    ).group_by(Equipment.category).order_by(func.count(Equipment.id).desc()).limit(5)
    cat_result = await db.execute(cat_query)
    
    # Recent events
    events_query = select(Event).order_by(Event.event_time.desc()).limit(10)
    events_result = await db.execute(events_query)
    recent_events = [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "severity": e.severity.value if hasattr(e.severity, 'value') else str(e.severity),
            "title": e.title,
            "event_time": e.event_time.isoformat() if e.event_time else None,
        }
        for e in events_result.scalars().all()
    ]
    
    return {
        "total_equipment": equip_total.scalar() or 0,
        "available_equipment": equip_available.scalar() or 0,
        "active_rentals": active_rentals.scalar() or 0,
        "total_customers": total_customers.scalar() or 0,
        "revenue_this_month": rev_this_val,
        "revenue_last_month": rev_last_val,
        "revenue_change_pct": round(rev_change, 1),
        "avg_utilization_rate": round(float(util.scalar() or 65), 1),
        "pending_maintenance": pending_maint.scalar() or 0,
        "active_alerts": active_alerts.scalar() or 0,
        "top_categories": [
            {"category": row.category, "count": row.count, "avg_health": round(float(row.avg_health or 0), 1)}
            for row in cat_result.all()
        ],
        "recent_events": recent_events,
    }


@router.get("/demand-forecast")
async def demand_forecast(
    category: str = "Excavator",
    region: str = "North",
    days: int = Query(30, le=90),
):
    """Get AI demand forecast for a category/region."""
    CATEGORY_MULT = {
        "Excavator": 1.35,
        "Loader": 1.10,
        "Crane": 0.75,
        "Bulldozer": 0.90,
        "Dump Truck": 1.20,
        "Forklift": 1.45,
        "Generator": 0.65,
        "Compactor": 0.50,
    }
    REGION_MULT = {
        "North": 1.20,
        "South": 0.85,
        "East": 1.05,
        "West": 0.95,
        "Central": 1.30,
    }

    cat_factor = CATEGORY_MULT.get(category, 1.0)
    reg_factor = REGION_MULT.get(region, 1.0)
    combined_factor = cat_factor * reg_factor

    forecasts = []
    base_date = datetime.now()
    
    for i in range(days):
        future = base_date + timedelta(days=i)
        month = future.month
        
        # Base demand influenced by category and region
        seasonal = np.sin(2 * np.pi * (month + i/30.0) / 12) * 2.5
        raw_demand = (5.5 + seasonal) * combined_factor
        noise = np.random.normal(0, 0.3)
        demand = max(0.5, raw_demand + noise)
        
        # Weekend dip
        if future.weekday() >= 5:
            demand *= 0.7
        
        std = demand * 0.18
        
        forecasts.append({
            "date": future.strftime("%Y-%m-%d"),
            "day": f"Day {i + 1}",
            "category": category,
            "region": region,
            "predicted_demand": round(demand, 1),
            "confidence_lower": round(max(0, demand - 1.96 * std), 1),
            "confidence_upper": round(demand + 1.96 * std, 1),
            "trend": "increasing" if combined_factor > 1.2 else "stable" if combined_factor >= 0.9 else "decreasing",
        })
    
    avg_demand = round(sum(f["predicted_demand"] for f in forecasts) / len(forecasts), 1)
    peak_forecast = max(forecasts, key=lambda f: f["predicted_demand"])
    
    return {
        "category": category,
        "region": region,
        "days": days,
        "forecasts": forecasts,
        "summary": {
            "avg_predicted_demand": avg_demand,
            "peak_day": peak_forecast["date"],
            "peak_demand": peak_forecast["predicted_demand"],
            "total_expected_rentals": round(sum(f["predicted_demand"] for f in forecasts), 0),
            "demand_intensity": "High" if combined_factor > 1.2 else "Medium" if combined_factor >= 0.9 else "Low",
        }
    }



@router.get("/pricing-recommendation")
async def pricing_recommendation(
    equipment_id: Optional[UUID] = None,
    category: str = "Excavator",
    db: AsyncSession = Depends(get_db)
):
    """Get dynamic pricing recommendation."""
    if equipment_id:
        result = await db.execute(
            select(Equipment).where(Equipment.id == equipment_id)
        )
        equip = result.scalar_one_or_none()
        if not equip:
            raise HTTPException(404, "Equipment not found")
        base_rate = equip.daily_rate
        health = equip.health_score
    else:
        # Average rate for category
        result = await db.execute(
            select(func.avg(Equipment.daily_rate), func.avg(Equipment.health_score)).where(
                Equipment.category == category
            )
        )
        row = result.one()
        base_rate = float(row[0] or 1000)
        health = float(row[1] or 80)
    
    # Dynamic pricing logic
    now = datetime.now()
    month = now.month
    
    # Seasonal multiplier
    if month in [4, 5, 6, 7, 8, 9]:
        seasonal = 1.15
    elif month in [11, 12, 1, 2]:
        seasonal = 0.85
    else:
        seasonal = 1.0
    
    # Health discount
    health_mult = 0.8 + (health / 100) * 0.2
    
    # Weekend
    weekend_mult = 0.95 if now.weekday() >= 5 else 1.0
    
    multiplier = seasonal * health_mult * weekend_mult
    recommended = round(base_rate * multiplier, 2)
    
    demand_level = "high" if seasonal > 1 else "low" if seasonal < 1 else "medium"
    
    return {
        "current_rate": round(base_rate, 2),
        "recommended_rate": recommended,
        "multiplier": round(multiplier, 3),
        "change_percentage": round((multiplier - 1) * 100, 1),
        "demand_level": demand_level,
        "factors": {
            "seasonal_factor": round(seasonal, 3),
            "health_factor": round(health_mult, 3),
            "day_factor": round(weekend_mult, 3),
        },
        "reason": f"Seasonal demand ({demand_level}), equipment health ({health:.0f}%), "
                  f"{'weekend discount applied' if weekend_mult < 1 else 'weekday pricing'}",
    }


@router.post("/job-fit")
async def job_fit_recommendation(
    job_type: str,
    area_sqm: Optional[float] = None,
    depth_m: Optional[float] = None,
    weight_tons: Optional[float] = None,
    duration_days: Optional[int] = None,
    soil_condition: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """AI-powered job-fit equipment recommendation."""
    # Get available equipment
    result = await db.execute(
        select(Equipment).where(Equipment.status == EquipmentStatus.AVAILABLE)
    )
    equipment_list = result.scalars().all()
    
    if not equipment_list:
        return {"recommendations": [], "message": "No equipment currently available"}
    
    # Job-category mapping
    JOB_CATEGORIES = {
        "excavation": ["Excavator"],
        "loading": ["Loader", "Forklift"],
        "grading": ["Bulldozer"],
        "lifting": ["Crane"],
        "hauling": ["Dump Truck"],
        "compaction": ["Compactor"],
        "power_generation": ["Generator"],
    }
    
    target_categories = JOB_CATEGORIES.get(job_type.lower(), list(JOB_CATEGORIES.values()))
    if isinstance(target_categories[0], list):
        target_categories = [c for cats in target_categories for c in cats]
    
    # Filter and score
    recommendations = []
    for equip in equipment_list:
        if equip.category not in target_categories:
            continue
        
        score = equip.health_score * 0.3
        
        # Prefer adequate but not oversized
        if weight_tons and equip.max_load_capacity:
            if equip.max_load_capacity >= weight_tons:
                ratio = weight_tons / equip.max_load_capacity
                score += ratio * 30
        
        # Cost efficiency
        if duration_days:
            estimated_cost = equip.daily_rate * duration_days
            score += max(0, 20 - estimated_cost / 1000)
        
        score = min(100, max(0, score))
        
        recommendations.append({
            "equipment_id": str(equip.id),
            "name": equip.name,
            "model": equip.model,
            "category": equip.category,
            "daily_rate": equip.daily_rate,
            "health_score": equip.health_score,
            "fit_score": round(score, 1),
            "estimated_cost": equip.daily_rate * (duration_days or 1),
            "reason": f"Optimal for {job_type}: {'right-sized' if score > 50 else 'adequate'} "
                      f"with {equip.health_score}% health",
        })
    
    # Sort by fit score
    recommendations.sort(key=lambda x: x["fit_score"], reverse=True)
    
    return {
        "job_type": job_type,
        "soil_condition": soil_condition,
        "area_sqm": area_sqm,
        "recommendations": recommendations[:5],
    }


@router.get("/customer/{customer_id}/stats")
async def customer_statistics(customer_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get comprehensive customer usage statistics."""
    customer_result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Rental stats
    rental_stats = await db.execute(
        select(
            func.count(Rental.id).label("total"),
            func.count(Rental.id).filter(Rental.status == RentalStatus.ACTIVE).label("active"),
            func.coalesce(func.sum(Rental.total_cost), 0).label("total_spent"),
            func.avg(
                func.extract("day", Rental.end_date - Rental.start_date)
            ).label("avg_duration"),
        ).where(Rental.customer_id == customer_id)
    )
    stats = rental_stats.one()
    
    # Most rented category
    cat_query = select(
        Equipment.category,
        func.count(Rental.id).label("count")
    ).join(
        Equipment, Rental.equipment_id == Equipment.id
    ).where(
        Rental.customer_id == customer_id
    ).group_by(
        Equipment.category
    ).order_by(func.count(Rental.id).desc()).limit(1)
    
    cat_result = await db.execute(cat_query)
    fav_cat = cat_result.first()
    
    return {
        "customer_id": str(customer_id),
        "name": customer.name,
        "total_rentals": stats.total or 0,
        "active_rentals": stats.active or 0,
        "total_spent": round(float(stats.total_spent or 0), 2),
        "avg_rental_duration_days": round(float(stats.avg_duration or 0), 1),
        "favorite_category": fav_cat.category if fav_cat else None,
        "insurance_risk_score": customer.insurance_risk_score,
        "lifetime_value": customer.lifetime_value,
    }


@router.get("/health-heatmap")
async def equipment_health_heatmap(db: AsyncSession = Depends(get_db)):
    """Get equipment health data for map heatmap visualization."""
    result = await db.execute(
        select(
            Equipment.id, Equipment.name, Equipment.category,
            Equipment.health_score, Equipment.latitude, Equipment.longitude,
            Equipment.status
        ).where(
            and_(Equipment.latitude.isnot(None), Equipment.longitude.isnot(None))
        )
    )
    
    return [
        {
            "equipment_id": str(row.id),
            "name": row.name,
            "category": row.category,
            "health_score": row.health_score,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "status": row.status.value if hasattr(row.status, 'value') else str(row.status),
        }
        for row in result.all()
    ]


# Need numpy for the forecast endpoint
import numpy as np
