"""
Rental API routes — booking lifecycle + analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, extract
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.models.models import Rental, RentalStatus, Equipment, EquipmentStatus, Customer, DailyLog
from app.models.schemas import RentalCreate, RentalResponse

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get("/", response_model=List[RentalResponse])
async def list_rentals(
    status: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    equipment_id: Optional[UUID] = None,
    start_after: Optional[date] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List rentals with filtering."""
    query = select(Rental)
    
    if status:
        query = query.where(Rental.status == status)
    if customer_id:
        query = query.where(Rental.customer_id == customer_id)
    if equipment_id:
        query = query.where(Rental.equipment_id == equipment_id)
    if start_after:
        query = query.where(Rental.start_date >= start_after)
    
    query = query.order_by(Rental.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=RentalResponse)
async def create_rental(data: RentalCreate, db: AsyncSession = Depends(get_db)):
    """Create a new rental booking."""
    # Check equipment availability
    equip_result = await db.execute(
        select(Equipment).where(Equipment.id == data.equipment_id)
    )
    equipment = equip_result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(404, "Equipment not found")
    if equipment.status != EquipmentStatus.AVAILABLE:
        raise HTTPException(400, f"Equipment is not available (current status: {equipment.status.value})")
    
    # Calculate cost
    duration = (data.end_date - data.start_date).days if data.end_date else 1
    total_cost = equipment.daily_rate * max(1, duration)
    
    rental = Rental(
        **data.model_dump(),
        daily_rate=equipment.daily_rate,
        total_cost=total_cost,
        status=RentalStatus.PENDING,
    )
    
    # Update equipment status
    equipment.status = EquipmentStatus.RENTED
    
    db.add(rental)
    await db.commit()
    await db.refresh(rental)
    return rental


@router.patch("/{rental_id}/checkout")
async def checkout_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Activate a pending rental (check-out)."""
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(404, "Rental not found")
    if rental.status != RentalStatus.PENDING:
        raise HTTPException(400, f"Cannot checkout: rental is {rental.status.value}")
    
    rental.status = RentalStatus.ACTIVE
    await db.commit()
    return {"message": "Rental checked out successfully", "status": "active"}


@router.patch("/{rental_id}/return")
async def return_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Complete a rental (check-in / return)."""
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(404, "Rental not found")
    if rental.status != RentalStatus.ACTIVE:
        raise HTTPException(400, f"Cannot return: rental is {rental.status.value}")
    
    rental.status = RentalStatus.COMPLETED
    rental.actual_return_date = date.today()
    
    # Recalculate cost if returned late/early
    actual_duration = (date.today() - rental.start_date).days
    rental.total_cost = rental.daily_rate * max(1, actual_duration)
    
    # Free up equipment
    equip_result = await db.execute(
        select(Equipment).where(Equipment.id == rental.equipment_id)
    )
    equipment = equip_result.scalar_one_or_none()
    if equipment:
        equipment.status = EquipmentStatus.AVAILABLE
    
    await db.commit()
    return {
        "message": "Rental returned successfully",
        "actual_duration_days": actual_duration,
        "total_cost": rental.total_cost,
    }


@router.get("/analytics/summary")
async def rental_analytics(db: AsyncSession = Depends(get_db)):
    """Get rental analytics summary for dashboard."""
    today = date.today()
    this_month_start = today.replace(day=1)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    
    # Current stats
    active_count = await db.execute(
        select(func.count(Rental.id)).where(Rental.status == RentalStatus.ACTIVE)
    )
    
    total_count = await db.execute(select(func.count(Rental.id)))
    
    # Revenue this month
    rev_this = await db.execute(
        select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
            and_(Rental.start_date >= this_month_start, Rental.status != RentalStatus.CANCELLED)
        )
    )
    
    # Revenue last month
    rev_last = await db.execute(
        select(func.coalesce(func.sum(Rental.total_cost), 0)).where(
            and_(
                Rental.start_date >= last_month_start,
                Rental.start_date < this_month_start,
                Rental.status != RentalStatus.CANCELLED
            )
        )
    )
    
    # Monthly trend (last 12 months)
    from app.core.config import settings
    if settings.DATABASE_URL.startswith("sqlite"):
        month_expr = func.strftime("%Y-%m", Rental.start_date)
    else:
        month_expr = func.date_trunc("month", Rental.start_date)

    monthly_query = select(
        month_expr.label("month"),
        func.count(Rental.id).label("count"),
        func.coalesce(func.sum(Rental.total_cost), 0).label("revenue"),
    ).where(
        Rental.start_date >= today - timedelta(days=365)
    ).group_by(
        month_expr
    ).order_by("month")
    
    monthly_result = await db.execute(monthly_query)
    monthly_data = [
        {
            "month": str(row.month)[:7],
            "count": row.count,
            "revenue": float(row.revenue),
        }
        for row in monthly_result.all()
    ]
    
    # Top categories
    cat_query = select(
        Equipment.category,
        func.count(Rental.id).label("rental_count"),
        func.coalesce(func.sum(Rental.total_cost), 0).label("revenue"),
    ).join(
        Equipment, Rental.equipment_id == Equipment.id
    ).group_by(Equipment.category).order_by(func.count(Rental.id).desc()).limit(5)
    
    cat_result = await db.execute(cat_query)
    top_categories = [
        {"category": row.category, "rental_count": row.rental_count, "revenue": float(row.revenue)}
        for row in cat_result.all()
    ]
    
    rev_this_val = float(rev_this.scalar() or 0)
    rev_last_val = float(rev_last.scalar() or 0)
    rev_change = ((rev_this_val - rev_last_val) / max(rev_last_val, 1)) * 100
    
    return {
        "active_rentals": active_count.scalar() or 0,
        "total_rentals": total_count.scalar() or 0,
        "revenue_this_month": rev_this_val,
        "revenue_last_month": rev_last_val,
        "revenue_change_pct": round(rev_change, 1),
        "monthly_trend": monthly_data,
        "top_categories": top_categories,
    }


@router.get("/analytics/utilization")
async def utilization_analytics(db: AsyncSession = Depends(get_db)):
    """Get fleet utilization analytics."""
    # Equipment utilization from daily logs
    util_query = select(
        DailyLog.equipment_id,
        Equipment.name,
        Equipment.category,
        func.sum(DailyLog.operating_hours).label("total_operating"),
        func.sum(DailyLog.idle_hours).label("total_idle"),
        func.sum(DailyLog.fuel_consumed_liters).label("total_fuel"),
        func.count(DailyLog.id).label("log_days"),
    ).join(
        Equipment, DailyLog.equipment_id == Equipment.id
    ).group_by(
        DailyLog.equipment_id, Equipment.name, Equipment.category
    ).order_by(func.sum(DailyLog.operating_hours).desc()).limit(20)
    
    result = await db.execute(util_query)
    
    utilization = []
    for row in result.all():
        total = float(row.total_operating or 0) + float(row.total_idle or 0)
        util_rate = (float(row.total_operating or 0) / max(total, 1)) * 100
        
        utilization.append({
            "equipment_id": str(row.equipment_id),
            "name": row.name,
            "category": row.category,
            "operating_hours": round(float(row.total_operating or 0), 1),
            "idle_hours": round(float(row.total_idle or 0), 1),
            "utilization_rate": round(util_rate, 1),
            "total_fuel_liters": round(float(row.total_fuel or 0), 1),
            "log_days": row.log_days,
        })
    
    return {
        "fleet_utilization": utilization,
        "avg_utilization_rate": round(
            sum(u["utilization_rate"] for u in utilization) / max(len(utilization), 1), 1
        ),
    }
