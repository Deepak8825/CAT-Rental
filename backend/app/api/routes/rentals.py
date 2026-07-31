"""
Rental API routes — booking lifecycle + analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, extract
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.models.models import Rental, RentalStatus, Equipment, EquipmentStatus, Customer, DailyLog, Booking, BookingStatus, Notification, BookingTracking
from app.models.schemas import RentalCreate, RentalResponse

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get("/")
async def list_rentals(
    status: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    equipment_id: Optional[UUID] = None,
    start_after: Optional[date] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List customer orders grouped into unified single rows per order."""
    query = select(Rental).options(
        selectinload(Rental.customer),
        selectinload(Rental.equipment)
    )
    
    if status and status.upper() != 'ALL':
        query = query.where(Rental.status == status.lower())
    if customer_id:
        query = query.where(Rental.customer_id == customer_id)
    if equipment_id:
        query = query.where(Rental.equipment_id == equipment_id)
    if start_after:
        query = query.where(Rental.start_date >= start_after)
        
    query = query.order_by(Rental.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rentals = result.scalars().all()

    # Group rentals by order
    orders_map = {}
    for r in rentals:
        group_key = str(r.id)
        if r.notes and "Multi-Order #" in r.notes:
            try:
                group_key = r.notes.split("Multi-Order #")[1].split(" ")[0]
            except Exception:
                pass
        
        if group_key not in orders_map:
            orders_map[group_key] = {
                "id": str(r.id),
                "order_key": group_key,
                "customer_name": r.customer.name if r.customer else "Customer",
                "customer_company": r.customer.company if (r.customer and r.customer.company) else (r.customer.email if r.customer else ""),
                "rentals": [],
                "units": [],
                "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
                "start_date": r.start_date,
                "end_date": r.end_date,
                "created_at": r.created_at,
            }
        orders_map[group_key]["rentals"].append(r)
        eq_name = r.equipment.name if r.equipment else "Equipment"
        eq_model = r.equipment.model if r.equipment else ""
        orders_map[group_key]["units"].append({"name": eq_name, "model": eq_model, "rate": r.daily_rate or 0, "cost": r.total_cost or 0})

    response_list = []
    for g_key, o in orders_map.items():
        name_counts = {}
        for u in o["units"]:
            name_counts[u["name"]] = name_counts.get(u["name"], 0) + 1
            
        eq_summary_parts = [f"{count}x {name}" for name, count in name_counts.items()]
        total_units = len(o["units"])
        eq_summary = ", ".join(eq_summary_parts) + (f" ({total_units} Units)" if total_units > 1 else "")
        
        models_str = ", ".join(list(set(u["model"] for u in o["units"] if u["model"])))
        total_daily_rate = sum(u["rate"] for u in o["units"])
        total_cost = sum(u["cost"] for u in o["units"])

        response_list.append({
            "id": o["id"],
            "order_id": g_key[:8],
            "customer_name": o["customer_name"],
            "customer_company": o["customer_company"],
            "equipment_name": eq_summary,
            "equipment_model": models_str,
            "start_date": str(o["start_date"]),
            "end_date": str(o["end_date"]) if o["end_date"] else "Ongoing",
            "daily_rate": round(total_daily_rate, 2),
            "total_cost": round(total_cost, 2),
            "status": o["status"],
            "total_units": total_units,
            "notes": o["rentals"][0].notes if o["rentals"] else "",
        })

    def status_rank(st):
        s = str(st).lower()
        if s == 'pending': return 1
        if s in ['active', 'confirmed', 'dispatched']: return 2
        return 3

    response_list.sort(key=lambda x: status_rank(x["status"]))
    return response_list


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


@router.patch("/{rental_id}/confirm")
async def confirm_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Dealer approves & confirms customer booking (single or multi-unit order)."""
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(404, "Rental not found")
    
    rental.status = RentalStatus.ACTIVE
    
    eq_name = "Equipment"
    if rental.equipment_id:
        eq_res = await db.execute(select(Equipment).where(Equipment.id == rental.equipment_id))
        eq = eq_res.scalar_one_or_none()
        if eq:
            eq_name = eq.name

    # Sync linked booking
    booking_res = await db.execute(select(Booking).where(Booking.rental_id == rental_id))
    booking = booking_res.scalar_one_or_none()
    
    if not booking and rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_b = await db.execute(select(Booking).where(Booking.customer_id == rental.customer_id))
            for b in all_b.scalars().all():
                if str(b.id).startswith(prefix):
                    booking = b
                    break
        except Exception:
            pass

    if rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_rentals = await db.execute(select(Rental).where(Rental.customer_id == rental.customer_id))
            for r in all_rentals.scalars().all():
                if r.notes and f"Multi-Order #{prefix}" in r.notes:
                    r.status = RentalStatus.ACTIVE
        except Exception:
            pass

    if booking:
        booking.status = BookingStatus.CONFIRMED

        # Notify the customer that the dealer confirmed
        notif = Notification(
            user_id=booking.customer_id,
            user_type="customer",
            title="Booking Confirmed by Caterpillar Dealer",
            message=f"Your order #{str(booking.id)[:8]} ({eq_name}) has been reviewed and confirmed by Caterpillar Dealer.",
            category="booking",
        )
        db.add(notif)

        # Add tracking timeline entry
        tracking = BookingTracking(
            booking_id=booking.id,
            status="confirmed",
            title="Confirmed by Caterpillar Dealer",
            description=f"Caterpillar Dealer has reviewed and confirmed your booking order for {eq_name}.",
        )
        db.add(tracking)

    await db.commit()
    return {"message": "Booking confirmed by Caterpillar Dealer", "status": "confirmed"}


@router.patch("/{rental_id}/checkout")
async def checkout_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Activate rental and dispatch equipment (check-out)."""
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(404, "Rental not found")
    
    rental.status = RentalStatus.ACTIVE
    
    # Update equipment status
    eq_name = "Equipment"
    if rental.equipment_id:
        eq_res = await db.execute(select(Equipment).where(Equipment.id == rental.equipment_id))
        eq = eq_res.scalar_one_or_none()
        if eq:
            eq.status = EquipmentStatus.RENTED
            eq_name = eq.name

    # Sync linked booking
    booking_res = await db.execute(select(Booking).where(Booking.rental_id == rental_id))
    booking = booking_res.scalar_one_or_none()
    
    if not booking and rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_b = await db.execute(select(Booking).where(Booking.customer_id == rental.customer_id))
            for b in all_b.scalars().all():
                if str(b.id).startswith(prefix):
                    booking = b
                    break
        except Exception:
            pass

    # Update all sibling rentals linked to this multi-order to ACTIVE and set machine status to RENTED
    if rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_rentals = await db.execute(select(Rental).where(Rental.customer_id == rental.customer_id))
            for r in all_rentals.scalars().all():
                if r.notes and f"Multi-Order #{prefix}" in r.notes:
                    r.status = RentalStatus.ACTIVE
                    if r.equipment_id:
                        req_res = await db.execute(select(Equipment).where(Equipment.id == r.equipment_id))
                        req_unit = req_res.scalar_one_or_none()
                        if req_unit:
                            req_unit.status = EquipmentStatus.RENTED
        except Exception:
            pass

    if booking:
        booking.status = BookingStatus.DISPATCHED

        # Notify customer that dealer dispatched equipment
        notif = Notification(
            user_id=booking.customer_id,
            user_type="customer",
            title="Equipment Dispatched by Caterpillar Dealer",
            message=f"Your booking order #{str(booking.id)[:8]} ({eq_name}) has been dispatched by Caterpillar Dealer to {booking.location}.",
            category="booking",
        )
        db.add(notif)

        # Add tracking timeline entry
        tracking = BookingTracking(
            booking_id=booking.id,
            status="dispatched",
            title="Approved & Dispatched by Caterpillar Dealer",
            description=f"Caterpillar Dealer has dispatched {eq_name} units to your site: {booking.location}.",
        )
        db.add(tracking)

    await db.commit()
    return {"message": "Rental dispatched and customer notified", "status": "dispatched"}


@router.patch("/{rental_id}/confirm-and-dispatch")
async def confirm_and_dispatch_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Single-click action: Dealer confirms booking AND dispatches equipment to customer in one step."""
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(404, "Rental not found")
    
    rental.status = RentalStatus.ACTIVE
    
    eq_name = "Equipment"
    if rental.equipment_id:
        eq_res = await db.execute(select(Equipment).where(Equipment.id == rental.equipment_id))
        eq = eq_res.scalar_one_or_none()
        if eq:
            eq.status = EquipmentStatus.RENTED
            eq_name = eq.name

    # Sync linked booking
    booking_res = await db.execute(select(Booking).where(Booking.rental_id == rental_id))
    booking = booking_res.scalar_one_or_none()
    
    if not booking and rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_b = await db.execute(select(Booking).where(Booking.customer_id == rental.customer_id))
            for b in all_b.scalars().all():
                if str(b.id).startswith(prefix):
                    booking = b
                    break
        except Exception:
            pass

    # Update all sibling rentals linked to this multi-order to ACTIVE and set machine status to RENTED
    if rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_rentals = await db.execute(select(Rental).where(Rental.customer_id == rental.customer_id))
            for r in all_rentals.scalars().all():
                if r.notes and f"Multi-Order #{prefix}" in r.notes:
                    r.status = RentalStatus.ACTIVE
                    if r.equipment_id:
                        req_res = await db.execute(select(Equipment).where(Equipment.id == r.equipment_id))
                        req_unit = req_res.scalar_one_or_none()
                        if req_unit:
                            req_unit.status = EquipmentStatus.RENTED
        except Exception:
            pass

    if booking:
        booking.status = BookingStatus.DISPATCHED

        # Notify customer that dealer approved & dispatched equipment
        notif = Notification(
            user_id=booking.customer_id,
            user_type="customer",
            title="Booking Confirmed & Dispatched by Caterpillar Dealer",
            message=f"Your booking order #{str(booking.id)[:8]} ({eq_name}) has been approved, confirmed, and dispatched by Caterpillar Dealer to {booking.location}.",
            category="booking",
        )
        db.add(notif)

        # Add tracking timeline entry
        tracking = BookingTracking(
            booking_id=booking.id,
            status="dispatched",
            title="Approved & Dispatched by Caterpillar Dealer",
            description=f"Caterpillar Dealer has confirmed and dispatched {eq_name} units to your site: {booking.location}.",
        )
        db.add(tracking)

    await db.commit()
    return {"message": "Booking confirmed and dispatched to customer", "status": "dispatched"}


@router.patch("/{rental_id}/return")
async def return_rental(rental_id: UUID, db: AsyncSession = Depends(get_db)):
    """Complete a rental (check-in / return). Syncs completion back to customer."""
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
    eq_name = "Equipment"
    if rental.equipment_id:
        equip_result = await db.execute(select(Equipment).where(Equipment.id == rental.equipment_id))
        equipment = equip_result.scalar_one_or_none()
        if equipment:
            equipment.status = EquipmentStatus.AVAILABLE
            eq_name = equipment.name

    # Sync linked booking
    booking_res = await db.execute(select(Booking).where(Booking.rental_id == rental_id))
    booking = booking_res.scalar_one_or_none()

    if not booking and rental.notes and "Multi-Order #" in rental.notes:
        try:
            prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
            all_b = await db.execute(select(Booking).where(Booking.customer_id == rental.customer_id))
            for b in all_b.scalars().all():
                if str(b.id).startswith(prefix):
                    booking = b
                    break
        except Exception:
            pass

    if booking:
        booking.status = BookingStatus.COMPLETED

        # Complete sibling rentals if multi-order
        if rental.notes and "Multi-Order #" in rental.notes:
            try:
                prefix = rental.notes.split("Multi-Order #")[1].split(" ")[0]
                all_rentals = await db.execute(select(Rental).where(Rental.customer_id == rental.customer_id))
                for r in all_rentals.scalars().all():
                    if r.notes and f"Multi-Order #{prefix}" in r.notes:
                        r.status = RentalStatus.COMPLETED
                        if r.equipment_id:
                            req_res = await db.execute(select(Equipment).where(Equipment.id == r.equipment_id))
                            req_unit = req_res.scalar_one_or_none()
                            if req_unit:
                                req_unit.status = EquipmentStatus.AVAILABLE
            except Exception:
                pass

        # Notify customer
        notif = Notification(
            user_id=booking.customer_id,
            user_type="customer",
            title="Rental Completed & Equipment Returned",
            message=f"Your rental order #{str(booking.id)[:8]} ({eq_name}) has been marked completed by Caterpillar Dealer.",
            category="booking",
        )
        db.add(notif)

        # Add tracking entry
        tracking = BookingTracking(
            booking_id=booking.id,
            status="completed",
            title="Rental Order Completed",
            description=f"Equipment {eq_name} checked-in and rental completed by Caterpillar Dealer.",
        )
        db.add(tracking)

    await db.commit()
    return {
        "message": "Rental returned and marked completed",
        "actual_duration_days": actual_duration,
        "total_cost": rental.total_cost,
        "status": "completed",
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
