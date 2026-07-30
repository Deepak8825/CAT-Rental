"""
Equipment API routes — CRUD + analytics endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.models.models import Equipment, EquipmentStatus, DailyLog, SensorReading
from app.models.schemas import (
    EquipmentCreate, EquipmentResponse, EquipmentHealth,
    SensorReadingCreate, SensorReadingResponse
)

router = APIRouter(prefix="/equipment", tags=["Equipment"])


@router.get("/", response_model=List[EquipmentResponse])
async def list_equipment(
    category: Optional[str] = None,
    status: Optional[str] = None,
    min_health: Optional[float] = None,
    dealer_id: Optional[UUID] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List equipment with filtering and pagination."""
    query = select(Equipment)
    
    if category:
        query = query.where(Equipment.category == category)
    if status:
        query = query.where(Equipment.status == status)
    if min_health is not None:
        query = query.where(Equipment.health_score >= min_health)
    if dealer_id:
        query = query.where(Equipment.dealer_id == dealer_id)
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all equipment categories with counts."""
    query = select(
        Equipment.category,
        func.count(Equipment.id).label("total"),
        func.count(Equipment.id).filter(Equipment.status == EquipmentStatus.AVAILABLE).label("available"),
        func.avg(Equipment.health_score).label("avg_health"),
        func.avg(Equipment.daily_rate).label("avg_rate"),
    ).group_by(Equipment.category)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "category": row.category,
            "total": row.total,
            "available": row.available,
            "avg_health": round(row.avg_health or 0, 1),
            "avg_daily_rate": round(row.avg_rate or 0, 2),
        }
        for row in rows
    ]


@router.get("/fleet-overview")
async def fleet_overview(db: AsyncSession = Depends(get_db)):
    """Get fleet-wide statistics for dashboard."""
    # Status distribution
    status_query = select(
        Equipment.status,
        func.count(Equipment.id)
    ).group_by(Equipment.status)
    status_result = await db.execute(status_query)
    status_dist = {str(row[0].value if hasattr(row[0], 'value') else row[0]): row[1] for row in status_result.all()}
    
    # Health distribution
    health_query = select(
        func.count(Equipment.id).filter(Equipment.health_score >= 80).label("good"),
        func.count(Equipment.id).filter(
            and_(Equipment.health_score >= 50, Equipment.health_score < 80)
        ).label("fair"),
        func.count(Equipment.id).filter(Equipment.health_score < 50).label("poor"),
        func.avg(Equipment.health_score).label("avg_health"),
        func.count(Equipment.id).label("total"),
    )
    health_result = await db.execute(health_query)
    health = health_result.one()
    
    return {
        "total_equipment": health.total,
        "status_distribution": status_dist,
        "health_distribution": {
            "good": health.good,
            "fair": health.fair,
            "poor": health.poor,
        },
        "average_health_score": round(health.avg_health or 0, 1),
    }


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(equipment_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get single equipment details."""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment


@router.post("/", response_model=EquipmentResponse)
async def create_equipment(data: EquipmentCreate, db: AsyncSession = Depends(get_db)):
    """Create new equipment."""
    equipment = Equipment(**data.model_dump())
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return equipment


@router.get("/{equipment_id}/health", response_model=EquipmentHealth)
async def get_equipment_health(equipment_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get AI-powered health assessment for equipment."""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equip = result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Determine risk level from health score
    if equip.health_score >= 80:
        risk = "low"
        action = "No immediate action required"
    elif equip.health_score >= 60:
        risk = "medium"
        action = "Schedule routine maintenance within 30 days"
    elif equip.health_score >= 40:
        risk = "high"
        action = "Plan maintenance within next 7 days"
    else:
        risk = "critical"
        action = "Immediate maintenance required"
    
    days_to_failure = max(1, int(equip.health_score * 1.2))
    
    return EquipmentHealth(
        equipment_id=equipment_id,
        health_score=equip.health_score,
        predicted_days_to_failure=days_to_failure,
        risk_level=risk,
        recommended_action=action,
        component_health={
            "engine": "healthy" if equip.health_score > 60 else "degraded",
            "hydraulics": "healthy" if equip.health_score > 50 else "degraded",
            "electrical": "healthy" if equip.health_score > 40 else "degraded",
        }
    )


@router.post("/{equipment_id}/sensor-readings", response_model=SensorReadingResponse)
async def ingest_sensor_reading(
    equipment_id: UUID,
    data: SensorReadingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Ingest a new IoT sensor reading."""
    reading = SensorReading(
        equipment_id=equipment_id,
        **data.model_dump(exclude={"equipment_id"})
    )
    
    # Simple anomaly check
    anomaly_indicators = 0
    if data.engine_temp and data.engine_temp > 100:
        anomaly_indicators += 1
    if data.hydraulic_pressure and data.hydraulic_pressure < 2200:
        anomaly_indicators += 1
    if data.battery_voltage and data.battery_voltage < 11.0:
        anomaly_indicators += 1
    if data.vibration_level and data.vibration_level > 5.0:
        anomaly_indicators += 1
    
    reading.is_anomaly = anomaly_indicators >= 2
    reading.anomaly_score = min(1.0, anomaly_indicators * 0.3)
    
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading
