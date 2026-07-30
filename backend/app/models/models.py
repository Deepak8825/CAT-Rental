"""
SQLAlchemy ORM Models for Caterpillar Dealer Asset Management Platform.

Covers 11 entities: Dealer, Customer, Equipment, Rental, DailyLog,
SensorReading, MaintenanceRecord, DamageReport, Invoice, Site, Event, Feedback.
"""
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Date, DateTime, 
    ForeignKey, Text, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


def EnumType(enum_cls):
    return SQLEnum(enum_cls, values_callable=lambda x: [e.value for e in x])


# ─── Enums ────────────────────────────────────────────────

class EquipmentStatus(str, enum.Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    TRANSIT = "transit"
    RETIRED = "retired"


class RentalStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class MaintenanceType(str, enum.Enum):
    SCHEDULED = "scheduled"
    PREDICTIVE = "predictive"
    EMERGENCY = "emergency"
    INSPECTION = "inspection"


class EventSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class DamageStatus(str, enum.Enum):
    DETECTED = "detected"
    UNDER_REVIEW = "under_review"
    CONFIRMED = "confirmed"
    DISPUTED = "disputed"
    RESOLVED = "resolved"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# ─── Models ───────────────────────────────────────────────

class Dealer(Base):
    """Equipment dealer/rental company."""
    __tablename__ = "dealers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    region = Column(String(100), nullable=False)
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String(20))
    email = Column(String(255))
    inventory_config = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    equipment = relationship("Equipment", back_populates="dealer", lazy="selectin")
    sites = relationship("Site", back_populates="dealer", lazy="selectin")


class Customer(Base):
    """Customer who rents equipment."""
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    company = Column(String(255))
    address = Column(Text)
    insurance_risk_score = Column(Float, default=50.0)  # 0-100 scale
    lifetime_value = Column(Float, default=0.0)
    total_rentals = Column(Integer, default=0)
    preferences = Column(JSON, default={})
    password_hash = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rentals = relationship("Rental", back_populates="customer", lazy="selectin")
    feedback = relationship("Feedback", back_populates="customer", lazy="selectin")

    __table_args__ = (
        Index("ix_customers_email", "email"),
        Index("ix_customers_company", "company"),
    )


class Equipment(Base):
    """Rental equipment / asset."""
    __tablename__ = "equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dealer_id = Column(UUID(as_uuid=True), ForeignKey("dealers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    model = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # excavator, loader, crane, etc.
    subcategory = Column(String(100))
    serial_number = Column(String(100), unique=True, nullable=False)
    year_manufactured = Column(Integer)
    status = Column(EnumType(EquipmentStatus), default=EquipmentStatus.AVAILABLE)
    health_score = Column(Float, default=100.0)  # 0-100
    daily_rate = Column(Float, nullable=False)
    hourly_rate = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    total_operating_hours = Column(Float, default=0.0)
    fuel_capacity = Column(Float)
    weight_tons = Column(Float)
    max_load_capacity = Column(Float)
    engine_power_hp = Column(Float)
    last_maintenance_date = Column(Date)
    next_maintenance_due = Column(Date)
    specifications = Column(JSON, default={})
    image_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    dealer = relationship("Dealer", back_populates="equipment")
    rentals = relationship("Rental", back_populates="equipment", lazy="selectin")
    sensor_readings = relationship("SensorReading", back_populates="equipment", lazy="noload")
    maintenance_records = relationship("MaintenanceRecord", back_populates="equipment", lazy="selectin")
    daily_logs = relationship("DailyLog", back_populates="equipment", lazy="noload")
    events = relationship("Event", back_populates="equipment", lazy="noload")

    __table_args__ = (
        Index("ix_equipment_status", "status"),
        Index("ix_equipment_category", "category"),
        Index("ix_equipment_dealer", "dealer_id"),
    )


class Site(Base):
    """Work site where equipment is deployed."""
    __tablename__ = "sites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dealer_id = Column(UUID(as_uuid=True), ForeignKey("dealers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    site_type = Column(String(50))  # construction, mining, demolition, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    dealer = relationship("Dealer", back_populates="sites")
    rentals = relationship("Rental", back_populates="site", lazy="selectin")


class Rental(Base):
    """Rental transaction / booking."""
    __tablename__ = "rentals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    actual_return_date = Column(Date)
    daily_rate = Column(Float, nullable=False)
    total_cost = Column(Float)
    status = Column(EnumType(RentalStatus), default=RentalStatus.PENDING)
    operator_name = Column(String(255))
    operator_certification = Column(String(100))
    contract_hash = Column(String(255))  # For blockchain integration
    notes = Column(Text)
    carbon_footprint_kg = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="rentals")
    equipment = relationship("Equipment", back_populates="rentals")
    site = relationship("Site", back_populates="rentals")
    daily_logs = relationship("DailyLog", back_populates="rental", lazy="noload")
    damage_reports = relationship("DamageReport", back_populates="rental", lazy="selectin")
    invoices = relationship("Invoice", back_populates="rental", lazy="selectin")

    __table_args__ = (
        Index("ix_rentals_status", "status"),
        Index("ix_rentals_customer", "customer_id"),
        Index("ix_rentals_equipment", "equipment_id"),
        Index("ix_rentals_dates", "start_date", "end_date"),
    )


class DailyLog(Base):
    """Daily operational log for rented equipment."""
    __tablename__ = "daily_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False)
    rental_id = Column(UUID(as_uuid=True), ForeignKey("rentals.id"))
    log_date = Column(Date, nullable=False)
    operating_hours = Column(Float, default=0.0)
    idle_hours = Column(Float, default=0.0)
    fuel_consumed_liters = Column(Float, default=0.0)
    distance_km = Column(Float, default=0.0)
    avg_engine_temp = Column(Float)
    max_engine_temp = Column(Float)
    avg_hydraulic_pressure = Column(Float)
    avg_battery_voltage = Column(Float)
    error_code_count = Column(Integer, default=0)
    weather_condition = Column(String(50))
    ambient_temp_celsius = Column(Float)
    operator_efficiency_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    equipment = relationship("Equipment", back_populates="daily_logs")
    rental = relationship("Rental", back_populates="daily_logs")

    __table_args__ = (
        Index("ix_daily_logs_date", "log_date"),
        Index("ix_daily_logs_equipment", "equipment_id"),
    )


class SensorReading(Base):
    """Real-time IoT sensor readings (time-series)."""
    __tablename__ = "sensor_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False)
    reading_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    engine_temp = Column(Float)
    hydraulic_pressure = Column(Float)
    battery_voltage = Column(Float)
    fuel_level = Column(Float)  # percentage
    rpm = Column(Float)
    vibration_level = Column(Float)
    oil_pressure = Column(Float)
    coolant_temp = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    speed_kmh = Column(Float)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float)

    # Relationships
    equipment = relationship("Equipment", back_populates="sensor_readings")

    __table_args__ = (
        Index("ix_sensor_readings_time", "reading_time"),
        Index("ix_sensor_readings_equipment", "equipment_id"),
    )


class MaintenanceRecord(Base):
    """Maintenance records for equipment."""
    __tablename__ = "maintenance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    completed_date = Column(Date)
    maintenance_type = Column(EnumType(MaintenanceType), default=MaintenanceType.SCHEDULED)
    description = Column(Text)
    parts_replaced = Column(JSON, default=[])
    cost = Column(Float, default=0.0)
    technician_name = Column(String(255))
    predicted_failure_component = Column(String(100))
    ml_confidence_score = Column(Float)  # ML prediction confidence
    downtime_hours = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    equipment = relationship("Equipment", back_populates="maintenance_records")


class DamageReport(Base):
    """AI-powered damage detection reports."""
    __tablename__ = "damage_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rental_id = Column(UUID(as_uuid=True), ForeignKey("rentals.id"), nullable=False)
    pre_scan_images = Column(JSON, default=[])  # S3 URLs
    post_scan_images = Column(JSON, default=[])  # S3 URLs
    ai_detected_damages = Column(JSON, default=[])  # {type, location, severity, confidence}
    estimated_repair_cost = Column(Float, default=0.0)
    status = Column(EnumType(DamageStatus), default=DamageStatus.DETECTED)
    reviewer_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rental = relationship("Rental", back_populates="damage_reports")


class Invoice(Base):
    """Financial invoices for rentals."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rental_id = Column(UUID(as_uuid=True), ForeignKey("rentals.id"), nullable=False)
    rental_cost = Column(Float, default=0.0)
    damage_cost = Column(Float, default=0.0)
    fuel_cost = Column(Float, default=0.0)
    delivery_cost = Column(Float, default=0.0)
    insurance_cost = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(EnumType(InvoiceStatus), default=InvoiceStatus.DRAFT)
    due_date = Column(Date)
    paid_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rental = relationship("Rental", back_populates="invoices")


class Event(Base):
    """System events triggered by equipment or business logic."""
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"))
    event_type = Column(String(100), nullable=False)  # geofence_breach, health_alert, etc.
    severity = Column(EnumType(EventSeverity), default=EventSeverity.INFO)
    title = Column(String(255))
    description = Column(Text)
    metadata_json = Column(JSON, default={})
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(255))
    event_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    equipment = relationship("Equipment", back_populates="events")

    __table_args__ = (
        Index("ix_events_type", "event_type"),
        Index("ix_events_severity", "severity"),
        Index("ix_events_time", "event_time"),
    )


class Feedback(Base):
    """Customer feedback and ratings."""
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    rental_id = Column(UUID(as_uuid=True), ForeignKey("rentals.id"))
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    sentiment_score = Column(Float)  # NLP-derived sentiment
    categories = Column(JSON, default=[])  # equipment_quality, service, pricing, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="feedback")


# ─── New Enums (Customer Portal) ─────────────────────────

class BookingStatus(str, enum.Enum):
    REQUESTED = "requested"
    QUOTED = "quoted"
    CONFIRMED = "confirmed"
    DISPATCHED = "dispatched"
    ACTIVE = "active"
    RETURNING = "returning"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentType(str, enum.Enum):
    ADVANCE = "advance"
    PARTIAL = "partial"
    BALANCE = "balance"
    REFUND = "refund"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ─── New Models (Customer Portal) ────────────────────────

class AdminUser(Base):
    """Admin / fleet operator accounts."""
    __tablename__ = "admin_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="admin")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_admin_users_email", "email"),
    )


class CustomerProfile(Base):
    """Extended customer profile data for the portal."""
    __tablename__ = "customer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), unique=True, nullable=False)
    business_type = Column(String(100))  # construction, mining, agriculture, etc.
    gst_number = Column(String(20))
    insurance_provider = Column(String(255))
    insurance_policy_number = Column(String(100))
    insurance_expiry = Column(Date)
    preferred_locations = Column(JSON, default=[])
    preferred_categories = Column(JSON, default=[])
    billing_address = Column(Text)
    site_address = Column(Text)
    profile_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", backref="profile")


class Booking(Base):
    """Customer rental booking request."""
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"))
    rental_id = Column(UUID(as_uuid=True), ForeignKey("rentals.id"))

    # Job Requirements
    job_type = Column(String(100), nullable=False)  # excavation, loading, grading, lifting, hauling
    construction_type = Column(String(100))  # road, mining, infrastructure, agriculture
    project_duration_days = Column(Integer, nullable=False)
    location = Column(String(500), nullable=False)
    location_lat = Column(Float)
    location_lng = Column(Float)
    budget_per_day = Column(Float)
    machine_preference = Column(String(255))
    terrain_type = Column(String(100))  # clay, rock, sand, mixed
    digging_depth_m = Column(Float)
    payload_tons = Column(Float)

    # Options
    operator_required = Column(Boolean, default=False)
    fuel_included = Column(Boolean, default=False)
    delivery_required = Column(Boolean, default=True)
    insurance_required = Column(Boolean, default=True)
    accessories = Column(JSON, default=[])

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)

    # Status & Tracking
    status = Column(EnumType(BookingStatus), default=BookingStatus.REQUESTED)
    admin_notes = Column(Text)
    assigned_operator = Column(String(255))
    estimated_delivery = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", backref="bookings")
    equipment = relationship("Equipment", backref="bookings")
    quotation = relationship("Quotation", back_populates="booking", uselist=False, lazy="selectin")
    payments = relationship("Payment", back_populates="booking", lazy="selectin")
    tracking = relationship("BookingTracking", back_populates="booking", order_by="BookingTracking.timestamp", lazy="selectin")
    recommendations = relationship("MachineRecommendation", back_populates="booking", lazy="selectin")

    __table_args__ = (
        Index("ix_bookings_customer", "customer_id"),
        Index("ix_bookings_status", "status"),
    )


class Quotation(Base):
    """Price quotation for a booking."""
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), unique=True, nullable=False)

    # Price Breakdown
    base_price = Column(Float, nullable=False)
    demand_multiplier = Column(Float, default=1.0)
    health_multiplier = Column(Float, default=1.0)
    seasonal_multiplier = Column(Float, default=1.0)
    transport_cost = Column(Float, default=0.0)
    insurance_cost = Column(Float, default=0.0)
    operator_cost = Column(Float, default=0.0)
    fuel_estimate = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.18)  # 18% GST
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    discount_reason = Column(String(255))
    total_price = Column(Float, nullable=False)

    # Explanation
    price_explanation = Column(Text)
    valid_until = Column(DateTime)
    is_accepted = Column(Boolean, default=False)
    accepted_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="quotation")


class Payment(Base):
    """Payment transactions for bookings."""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_type = Column(EnumType(PaymentType), nullable=False)
    method = Column(String(50), default="online")  # online, bank_transfer, cash
    status = Column(EnumType(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_ref = Column(String(255))
    receipt_url = Column(String(500))
    notes = Column(Text)
    paid_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="payments")


class BookingTracking(Base):
    """Timeline events for booking lifecycle."""
    __tablename__ = "booking_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    status = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    location_lat = Column(Float)
    location_lng = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="tracking")


class Notification(Base):
    """In-app notifications for users."""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_type = Column(String(20), nullable=False)  # admin, customer
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="general")  # booking, payment, alert, ai, system
    is_read = Column(Boolean, default=False)
    link = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_notifications_user", "user_id", "user_type"),
    )


class MachineRecommendation(Base):
    """AI-generated machine recommendation for a booking."""
    __tablename__ = "machine_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False)
    fit_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    estimated_fuel_per_day = Column(Float)
    expected_productivity = Column(Float)
    risk_score = Column(Float)
    reasoning = Column(JSON, default=[])  # List of explanation strings
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="recommendations")
    equipment = relationship("Equipment")


class SupportTicket(Base):
    """Customer support tickets."""
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"))
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(EnumType(TicketStatus), default=TicketStatus.OPEN)
    priority = Column(EnumType(TicketPriority), default=TicketPriority.MEDIUM)
    admin_response = Column(Text)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", backref="support_tickets")
