"""
Customer Portal API routes — Bookings, Recommendations, Payments, Profile.
All endpoints require customer role authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import require_role
from app.models.models import (
    Customer, CustomerProfile, Equipment, EquipmentStatus,
    Booking, BookingStatus, Quotation, Payment, PaymentStatus, PaymentType,
    BookingTracking, Notification, MachineRecommendation, SupportTicket,
    TicketStatus, TicketPriority
)

router = APIRouter(prefix="/customer", tags=["Customer Portal"])


# ─── Request Schemas ─────────────────────────────────────

class ProfileUpdate(BaseModel):
    company: Optional[str] = None
    phone: Optional[str] = None
    business_type: Optional[str] = None
    gst_number: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    preferred_locations: Optional[list] = None
    preferred_categories: Optional[list] = None
    billing_address: Optional[str] = None
    site_address: Optional[str] = None


class BookingCreate(BaseModel):
    job_type: str
    construction_type: Optional[str] = None
    project_duration_days: int = Field(ge=1)
    location: str
    budget_per_day: Optional[float] = None
    machine_preference: Optional[str] = None
    terrain_type: Optional[str] = None
    digging_depth_m: Optional[float] = None
    payload_tons: Optional[float] = None
    operator_required: bool = False
    fuel_included: bool = False
    delivery_required: bool = True
    insurance_required: bool = True
    start_date: date
    end_date: Optional[date] = None
    accessories: Optional[list] = []


class PaymentCreate(BaseModel):
    booking_id: UUID
    amount: float = Field(gt=0)
    payment_type: str  # advance, partial, balance
    method: str = "online"


class TicketCreate(BaseModel):
    booking_id: Optional[UUID] = None
    subject: str
    description: str
    priority: str = "medium"


# ─── Profile ─────────────────────────────────────────────

@router.get("/profile")
async def get_profile(
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Get customer profile with extended data."""
    cust_result = await db.execute(
        select(Customer).where(Customer.id == UUID(current_user["user_id"]))
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")

    prof_result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.customer_id == customer.id)
    )
    profile = prof_result.scalar_one_or_none()

    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "company": customer.company,
        "address": customer.address,
        "insurance_risk_score": customer.insurance_risk_score,
        "lifetime_value": customer.lifetime_value,
        "total_rentals": customer.total_rentals,
        "profile": {
            "business_type": profile.business_type if profile else None,
            "gst_number": profile.gst_number if profile else None,
            "insurance_provider": profile.insurance_provider if profile else None,
            "insurance_policy_number": profile.insurance_policy_number if profile else None,
            "preferred_locations": profile.preferred_locations if profile else [],
            "preferred_categories": profile.preferred_categories if profile else [],
            "billing_address": profile.billing_address if profile else None,
            "site_address": profile.site_address if profile else None,
            "profile_completed": profile.profile_completed if profile else False,
        }
    }


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Update customer profile."""
    uid = UUID(current_user["user_id"])

    # Update customer table fields
    cust_result = await db.execute(select(Customer).where(Customer.id == uid))
    customer = cust_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")

    if data.company is not None:
        customer.company = data.company
    if data.phone is not None:
        customer.phone = data.phone

    # Update or create profile
    prof_result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.customer_id == uid)
    )
    profile = prof_result.scalar_one_or_none()
    if not profile:
        profile = CustomerProfile(customer_id=uid)
        db.add(profile)

    for field in ["business_type", "gst_number", "insurance_provider",
                  "insurance_policy_number", "preferred_locations",
                  "preferred_categories", "billing_address", "site_address"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(profile, field, val)

    # Mark profile as completed if key fields are filled
    if profile.business_type and profile.gst_number and profile.billing_address:
        profile.profile_completed = True

    await db.commit()
    return {"message": "Profile updated successfully"}


# ─── Equipment Search ────────────────────────────────────

@router.get("/inventory/search")
async def search_equipment(
    category: Optional[str] = None,
    min_health: Optional[float] = None,
    max_rate: Optional[float] = None,
    limit: int = Query(20, le=50),
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Search available equipment inventory."""
    query = select(Equipment).where(Equipment.status == EquipmentStatus.AVAILABLE)

    if category:
        query = query.where(Equipment.category == category)
    if min_health:
        query = query.where(Equipment.health_score >= min_health)
    if max_rate:
        query = query.where(Equipment.daily_rate <= max_rate)

    query = query.order_by(Equipment.health_score.desc()).limit(limit)
    result = await db.execute(query)
    equipment = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "name": e.name,
            "model": e.model,
            "category": e.category,
            "daily_rate": e.daily_rate,
            "health_score": e.health_score,
            "weight_tons": e.weight_tons,
            "max_load_capacity": e.max_load_capacity,
            "engine_power_hp": e.engine_power_hp,
            "fuel_capacity": e.fuel_capacity,
            "year_manufactured": e.year_manufactured,
            "status": e.status.value if hasattr(e.status, 'value') else str(e.status),
        }
        for e in equipment
    ]


# ─── Bookings ────────────────────────────────────────────

@router.post("/bookings")
async def create_booking(
    data: BookingCreate,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Create a new rental booking request."""
    uid = UUID(current_user["user_id"])

    booking = Booking(
        customer_id=uid,
        job_type=data.job_type,
        construction_type=data.construction_type,
        project_duration_days=data.project_duration_days,
        location=data.location,
        budget_per_day=data.budget_per_day,
        machine_preference=data.machine_preference,
        terrain_type=data.terrain_type,
        digging_depth_m=data.digging_depth_m,
        payload_tons=data.payload_tons,
        operator_required=data.operator_required,
        fuel_included=data.fuel_included,
        delivery_required=data.delivery_required,
        insurance_required=data.insurance_required,
        start_date=data.start_date,
        end_date=data.end_date or (data.start_date + timedelta(days=data.project_duration_days)),
        accessories=data.accessories or [],
        status=BookingStatus.REQUESTED,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Add tracking entry
    tracking = BookingTracking(
        booking_id=booking.id,
        status="requested",
        title="Booking Request Submitted",
        description=f"Rental request for {data.job_type} job, {data.project_duration_days} days at {data.location}",
    )
    db.add(tracking)

    # Create notification
    notif = Notification(
        user_id=uid,
        user_type="customer",
        title="Booking Created",
        message=f"Your booking request #{str(booking.id)[:8]} has been submitted. Our team will review and send a quotation.",
        category="booking",
    )
    db.add(notif)
    await db.commit()

    # Generate AI recommendations
    await _generate_recommendations(booking, db)

    return {
        "booking_id": str(booking.id),
        "status": "requested",
        "message": "Booking request created. AI is analyzing your requirements.",
    }


@router.get("/bookings")
async def list_bookings(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """List all bookings for the current customer."""
    uid = UUID(current_user["user_id"])
    query = select(Booking).where(Booking.customer_id == uid)

    if status_filter:
        query = query.where(Booking.status == status_filter)

    query = query.order_by(Booking.created_at.desc())
    result = await db.execute(query)
    bookings = result.scalars().all()

    return [
        {
            "id": str(b.id),
            "job_type": b.job_type,
            "construction_type": b.construction_type,
            "location": b.location,
            "duration_days": b.project_duration_days,
            "start_date": str(b.start_date),
            "end_date": str(b.end_date) if b.end_date else None,
            "status": b.status.value if hasattr(b.status, 'value') else str(b.status),
            "equipment_id": str(b.equipment_id) if b.equipment_id else None,
            "budget_per_day": b.budget_per_day,
            "operator_required": b.operator_required,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "has_quotation": b.quotation is not None,
            "total_price": b.quotation.total_price if b.quotation else None,
        }
        for b in bookings
    ]


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: UUID,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed booking info with tracking timeline."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Booking).where(and_(Booking.id == booking_id, Booking.customer_id == uid))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    # Get equipment info if assigned
    equip_info = None
    if booking.equipment_id:
        eq_result = await db.execute(
            select(Equipment).where(Equipment.id == booking.equipment_id)
        )
        eq = eq_result.scalar_one_or_none()
        if eq:
            equip_info = {
                "id": str(eq.id), "name": eq.name, "model": eq.model,
                "category": eq.category, "health_score": eq.health_score,
                "daily_rate": eq.daily_rate,
            }

    return {
        "id": str(booking.id),
        "job_type": booking.job_type,
        "construction_type": booking.construction_type,
        "location": booking.location,
        "duration_days": booking.project_duration_days,
        "start_date": str(booking.start_date),
        "end_date": str(booking.end_date) if booking.end_date else None,
        "status": booking.status.value if hasattr(booking.status, 'value') else str(booking.status),
        "terrain_type": booking.terrain_type,
        "digging_depth_m": booking.digging_depth_m,
        "payload_tons": booking.payload_tons,
        "budget_per_day": booking.budget_per_day,
        "operator_required": booking.operator_required,
        "fuel_included": booking.fuel_included,
        "delivery_required": booking.delivery_required,
        "equipment": equip_info,
        "quotation": {
            "base_price": booking.quotation.base_price,
            "demand_multiplier": booking.quotation.demand_multiplier,
            "health_multiplier": booking.quotation.health_multiplier,
            "seasonal_multiplier": booking.quotation.seasonal_multiplier,
            "transport_cost": booking.quotation.transport_cost,
            "insurance_cost": booking.quotation.insurance_cost,
            "operator_cost": booking.quotation.operator_cost,
            "fuel_estimate": booking.quotation.fuel_estimate,
            "tax_amount": booking.quotation.tax_amount,
            "discount_amount": booking.quotation.discount_amount,
            "total_price": booking.quotation.total_price,
            "price_explanation": booking.quotation.price_explanation,
            "is_accepted": booking.quotation.is_accepted,
        } if booking.quotation else None,
        "tracking": [
            {
                "status": t.status,
                "title": t.title,
                "description": t.description,
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            }
            for t in (booking.tracking or [])
        ],
        "payments": [
            {
                "id": str(p.id),
                "amount": p.amount,
                "type": p.payment_type.value if hasattr(p.payment_type, 'value') else str(p.payment_type),
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "method": p.method,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            }
            for p in (booking.payments or [])
        ],
        "recommendations": [
            {
                "equipment_id": str(r.equipment_id),
                "fit_score": r.fit_score,
                "confidence": r.confidence,
                "estimated_fuel_per_day": r.estimated_fuel_per_day,
                "expected_productivity": r.expected_productivity,
                "risk_score": r.risk_score,
                "reasoning": r.reasoning,
                "is_primary": r.is_primary,
            }
            for r in (booking.recommendations or [])
        ],
    }


@router.post("/bookings/{booking_id}/accept-quote")
async def accept_quotation(
    booking_id: UUID,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Accept a quotation for a booking."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Booking).where(and_(Booking.id == booking_id, Booking.customer_id == uid))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if not booking.quotation:
        raise HTTPException(400, "No quotation available for this booking")
    if booking.quotation.is_accepted:
        raise HTTPException(400, "Quotation already accepted")

    booking.quotation.is_accepted = True
    booking.quotation.accepted_at = datetime.utcnow()
    booking.status = BookingStatus.CONFIRMED

    tracking = BookingTracking(
        booking_id=booking.id,
        status="confirmed",
        title="Quotation Accepted",
        description=f"Customer accepted quotation of ₹{booking.quotation.total_price:,.0f}. Booking confirmed.",
    )
    db.add(tracking)
    await db.commit()

    return {"message": "Quotation accepted. Booking confirmed.", "status": "confirmed"}


@router.post("/bookings/{booking_id}/return-request")
async def request_return(
    booking_id: UUID,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Initiate equipment return."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Booking).where(and_(Booking.id == booking_id, Booking.customer_id == uid))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.ACTIVE:
        raise HTTPException(400, "Only active bookings can be returned")

    booking.status = BookingStatus.RETURNING

    tracking = BookingTracking(
        booking_id=booking.id,
        status="returning",
        title="Return Requested",
        description="Customer has initiated equipment return. Pickup will be scheduled.",
    )
    db.add(tracking)
    await db.commit()

    return {"message": "Return request submitted. Pickup will be scheduled.", "status": "returning"}


# ─── Recommendations ─────────────────────────────────────

@router.get("/recommendations/{booking_id}")
async def get_recommendations(
    booking_id: UUID,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Get AI recommendations for a booking."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Booking).where(and_(Booking.id == booking_id, Booking.customer_id == uid))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    recs = []
    for r in (booking.recommendations or []):
        eq_result = await db.execute(select(Equipment).where(Equipment.id == r.equipment_id))
        eq = eq_result.scalar_one_or_none()
        recs.append({
            "equipment_id": str(r.equipment_id),
            "equipment_name": eq.name if eq else "Unknown",
            "equipment_model": eq.model if eq else "Unknown",
            "category": eq.category if eq else "Unknown",
            "daily_rate": eq.daily_rate if eq else 0,
            "health_score": eq.health_score if eq else 0,
            "fit_score": r.fit_score,
            "confidence": r.confidence,
            "estimated_fuel_per_day": r.estimated_fuel_per_day,
            "expected_productivity": r.expected_productivity,
            "risk_score": r.risk_score,
            "reasoning": r.reasoning,
            "is_primary": r.is_primary,
        })

    return {"booking_id": str(booking_id), "recommendations": recs}


# ─── Payments ─────────────────────────────────────────────

@router.post("/payments")
async def make_payment(
    data: PaymentCreate,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Process a payment for a booking."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Booking).where(and_(Booking.id == data.booking_id, Booking.customer_id == uid))
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    payment = Payment(
        booking_id=booking.id,
        amount=data.amount,
        payment_type=data.payment_type,
        method=data.method,
        status=PaymentStatus.COMPLETED,
        transaction_ref=f"TXN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{str(booking.id)[:4]}",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    tracking = BookingTracking(
        booking_id=booking.id,
        status="payment",
        title=f"Payment Received — ₹{data.amount:,.0f}",
        description=f"{data.payment_type.capitalize()} payment of ₹{data.amount:,.0f} via {data.method}",
    )
    db.add(tracking)
    await db.commit()
    await db.refresh(payment)

    return {
        "payment_id": str(payment.id),
        "amount": payment.amount,
        "transaction_ref": payment.transaction_ref,
        "status": "completed",
        "message": "Payment processed successfully",
    }


@router.get("/payments")
async def list_payments(
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """List all payments for the customer's bookings."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(Booking.customer_id == uid)
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    return [
        {
            "id": str(p.id),
            "booking_id": str(p.booking_id),
            "amount": p.amount,
            "type": p.payment_type.value if hasattr(p.payment_type, 'value') else str(p.payment_type),
            "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
            "method": p.method,
            "transaction_ref": p.transaction_ref,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        }
        for p in payments
    ]


# ─── Notifications ────────────────────────────────────────

@router.get("/notifications")
async def list_notifications(
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """List notifications for the current customer."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Notification)
        .where(and_(Notification.user_id == uid, Notification.user_type == "customer"))
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifs = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "category": n.category,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: UUID,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(Notification).where(and_(Notification.id == notif_id, Notification.user_id == uid))
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(404, "Notification not found")

    notif.is_read = True
    await db.commit()
    return {"message": "Marked as read"}


# ─── Support ─────────────────────────────────────────────

@router.post("/support")
async def create_ticket(
    data: TicketCreate,
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """Create a support ticket."""
    uid = UUID(current_user["user_id"])
    ticket = SupportTicket(
        customer_id=uid,
        booking_id=data.booking_id,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": str(ticket.id),
        "status": "open",
        "message": "Support ticket created. Our team will respond shortly.",
    }


@router.get("/support")
async def list_tickets(
    current_user: dict = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db)
):
    """List support tickets."""
    uid = UUID(current_user["user_id"])
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.customer_id == uid).order_by(SupportTicket.created_at.desc())
    )
    tickets = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "subject": t.subject,
            "description": t.description,
            "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
            "priority": t.priority.value if hasattr(t.priority, 'value') else str(t.priority),
            "admin_response": t.admin_response,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tickets
    ]


# ─── AI Recommendation Helper ────────────────────────────

async def _generate_recommendations(booking: Booking, db: AsyncSession):
    """Generate AI machine recommendations for a booking."""
    import math

    # Job-category mapping
    JOB_CATEGORIES = {
        "excavation": ["Excavator"],
        "loading": ["Loader", "Forklift"],
        "grading": ["Bulldozer"],
        "lifting": ["Crane"],
        "hauling": ["Dump Truck"],
        "compaction": ["Compactor"],
        "power": ["Generator"],
    }

    target_cats = JOB_CATEGORIES.get(booking.job_type.lower(), list(set(c for cats in JOB_CATEGORIES.values() for c in cats)))

    # Get available equipment
    result = await db.execute(
        select(Equipment).where(
            and_(
                Equipment.status == EquipmentStatus.AVAILABLE,
                Equipment.category.in_(target_cats)
            )
        ).limit(20)
    )
    equipment = result.scalars().all()

    recommendations = []
    for eq in equipment:
        score = 0.0
        reasoning = []

        # Health contribution (0-25)
        health_score = eq.health_score * 0.25
        score += health_score
        reasoning.append(f"Equipment health: {eq.health_score}% ({'excellent' if eq.health_score >= 80 else 'good' if eq.health_score >= 60 else 'fair'})")

        # Category match (0-25)
        if eq.category in target_cats:
            score += 25
            reasoning.append(f"{eq.category} is optimal for {booking.job_type} jobs")

        # Load capacity match (0-20)
        if booking.payload_tons and eq.max_load_capacity:
            if eq.max_load_capacity >= booking.payload_tons:
                ratio = booking.payload_tons / eq.max_load_capacity
                cap_score = ratio * 20  # Prefer right-sized, not oversized
                score += cap_score
                reasoning.append(f"Load capacity {eq.max_load_capacity}t covers {booking.payload_tons}t requirement ({ratio*100:.0f}% utilization)")
            else:
                reasoning.append(f"⚠ Load capacity {eq.max_load_capacity}t may be insufficient for {booking.payload_tons}t")
        else:
            score += 10
            reasoning.append("Load capacity adequate for general use")

        # Budget match (0-15)
        if booking.budget_per_day and eq.daily_rate:
            if eq.daily_rate <= booking.budget_per_day:
                score += 15
                reasoning.append(f"Daily rate ₹{eq.daily_rate:,.0f} is within budget ₹{booking.budget_per_day:,.0f}")
            else:
                score += 5
                reasoning.append(f"Daily rate ₹{eq.daily_rate:,.0f} exceeds budget ₹{booking.budget_per_day:,.0f}")
        else:
            score += 10

        # Engine power for terrain (0-15)
        if booking.terrain_type:
            terrain_power = {"rock": 300, "clay": 200, "sand": 150, "mixed": 250}
            min_power = terrain_power.get(booking.terrain_type.lower(), 200)
            if eq.engine_power_hp and eq.engine_power_hp >= min_power:
                score += 15
                reasoning.append(f"{eq.engine_power_hp}HP engine suitable for {booking.terrain_type} terrain")
            else:
                score += 5
                reasoning.append(f"Engine power may need verification for {booking.terrain_type} terrain")
        else:
            score += 10

        # Normalize
        score = min(100, score)
        confidence = min(98, score * 0.95 + (eq.health_score * 0.05))

        # Estimated fuel
        fuel_per_day = (eq.fuel_capacity or 400) * 0.08 * (1.2 if booking.terrain_type == "rock" else 1.0)

        # Productivity estimate
        productivity = score * 0.85

        # Risk score (lower is better)
        risk = max(5, 100 - eq.health_score)

        is_primary = len(recommendations) == 0  # First one is primary

        rec = MachineRecommendation(
            booking_id=booking.id,
            equipment_id=eq.id,
            fit_score=round(score, 1),
            confidence=round(confidence, 1),
            estimated_fuel_per_day=round(fuel_per_day, 1),
            expected_productivity=round(productivity, 1),
            risk_score=round(risk, 1),
            reasoning=reasoning,
            is_primary=is_primary,
        )
        recommendations.append((score, rec))

    # Sort by score and keep top 5
    recommendations.sort(key=lambda x: x[0], reverse=True)
    for i, (_, rec) in enumerate(recommendations[:5]):
        rec.is_primary = (i == 0)
        db.add(rec)

    # Auto-generate quotation for the primary recommendation
    if recommendations:
        best_score, best_rec = recommendations[0]
        eq_result = await db.execute(select(Equipment).where(Equipment.id == best_rec.equipment_id))
        best_eq = eq_result.scalar_one_or_none()

        if best_eq:
            booking.equipment_id = best_eq.id

            # Dynamic pricing
            base = best_eq.daily_rate * booking.project_duration_days
            demand_mult = 1.15 if datetime.now().month in [4,5,6,7,8,9] else 0.95
            health_mult = 0.85 + (best_eq.health_score / 100) * 0.15
            seasonal_mult = demand_mult
            transport = 5000 if booking.delivery_required else 0
            insurance = base * 0.05 if booking.insurance_required else 0
            operator = 2500 * booking.project_duration_days if booking.operator_required else 0
            fuel_est = best_rec.estimated_fuel_per_day * booking.project_duration_days * 95  # ₹95/L
            subtotal = base * demand_mult * health_mult + transport + insurance + operator + (fuel_est if booking.fuel_included else 0)
            tax = subtotal * 0.18
            total = subtotal + tax

            explanation = (
                f"Base rate: ₹{best_eq.daily_rate:,.0f}/day × {booking.project_duration_days} days = ₹{base:,.0f}. "
                f"Demand factor: ×{demand_mult:.2f} (seasonal). "
                f"Health factor: ×{health_mult:.2f} ({best_eq.health_score}% health). "
                f"Transport: ₹{transport:,.0f}. Insurance: ₹{insurance:,.0f}. "
                f"Operator: ₹{operator:,.0f}. GST 18%: ₹{tax:,.0f}."
            )

            quotation = Quotation(
                booking_id=booking.id,
                base_price=base,
                demand_multiplier=demand_mult,
                health_multiplier=health_mult,
                seasonal_multiplier=seasonal_mult,
                transport_cost=transport,
                insurance_cost=insurance,
                operator_cost=operator,
                fuel_estimate=fuel_est if booking.fuel_included else 0,
                tax_amount=round(tax, 2),
                total_price=round(total, 2),
                price_explanation=explanation,
                valid_until=datetime.utcnow() + timedelta(days=7),
            )
            db.add(quotation)

            booking.status = BookingStatus.QUOTED
            tracking = BookingTracking(
                booking_id=booking.id,
                status="quoted",
                title="AI Analysis Complete — Quotation Generated",
                description=f"Recommended: {best_eq.name}. Total: ₹{total:,.0f} for {booking.project_duration_days} days.",
            )
            db.add(tracking)

    await db.commit()
