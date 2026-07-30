"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, datetime
from uuid import UUID
from enum import Enum


# ─── Enums ────────────────────────────────────────────────

class EquipmentStatusEnum(str, Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    TRANSIT = "transit"
    RETIRED = "retired"


class RentalStatusEnum(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


# ─── Dealer Schemas ──────────────────────────────────────

class DealerBase(BaseModel):
    name: str
    region: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class DealerCreate(DealerBase):
    pass


class DealerResponse(DealerBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Customer Schemas ────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    password: str = Field(min_length=6)


class CustomerResponse(CustomerBase):
    id: UUID
    insurance_risk_score: float
    lifetime_value: float
    total_rentals: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerStats(BaseModel):
    total_rentals: int
    active_rentals: int
    total_spent: float
    avg_rental_duration_days: float
    favorite_category: Optional[str] = None
    insurance_risk_score: float
    lifetime_value: float


# ─── Equipment Schemas ───────────────────────────────────

class EquipmentBase(BaseModel):
    name: str
    model: str
    category: str
    serial_number: str
    daily_rate: float
    hourly_rate: Optional[float] = None
    weight_tons: Optional[float] = None
    engine_power_hp: Optional[float] = None
    max_load_capacity: Optional[float] = None
    fuel_capacity: Optional[float] = None
    year_manufactured: Optional[int] = None


class EquipmentCreate(EquipmentBase):
    dealer_id: UUID


class EquipmentResponse(EquipmentBase):
    id: UUID
    dealer_id: UUID
    status: EquipmentStatusEnum
    health_score: float
    total_operating_hours: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentHealth(BaseModel):
    equipment_id: UUID
    health_score: float
    predicted_days_to_failure: Optional[int] = None
    risk_level: str  # low, medium, high, critical
    recommended_action: Optional[str] = None
    component_health: dict = {}


# ─── Rental Schemas ──────────────────────────────────────

class RentalBase(BaseModel):
    equipment_id: UUID
    start_date: date
    end_date: Optional[date] = None
    site_id: Optional[UUID] = None
    operator_name: Optional[str] = None
    notes: Optional[str] = None


class RentalCreate(RentalBase):
    customer_id: UUID


class RentalResponse(RentalBase):
    id: UUID
    customer_id: UUID
    daily_rate: float
    total_cost: Optional[float] = None
    status: RentalStatusEnum
    carbon_footprint_kg: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Sensor Reading Schemas ──────────────────────────────

class SensorReadingCreate(BaseModel):
    equipment_id: UUID
    engine_temp: Optional[float] = None
    hydraulic_pressure: Optional[float] = None
    battery_voltage: Optional[float] = None
    fuel_level: Optional[float] = None
    rpm: Optional[float] = None
    vibration_level: Optional[float] = None
    oil_pressure: Optional[float] = None
    coolant_temp: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_kmh: Optional[float] = None


class SensorReadingResponse(SensorReadingCreate):
    id: UUID
    reading_time: datetime
    is_anomaly: bool
    anomaly_score: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Daily Log Schemas ───────────────────────────────────

class DailyLogResponse(BaseModel):
    id: UUID
    equipment_id: UUID
    rental_id: Optional[UUID] = None
    log_date: date
    operating_hours: float
    idle_hours: float
    fuel_consumed_liters: float
    distance_km: float
    avg_engine_temp: Optional[float] = None
    avg_hydraulic_pressure: Optional[float] = None
    avg_battery_voltage: Optional[float] = None
    error_code_count: int
    weather_condition: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Analytics Schemas ───────────────────────────────────

class DemandForecast(BaseModel):
    category: str
    region: str
    date: date
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float
    trend: str  # increasing, decreasing, stable


class FleetUtilization(BaseModel):
    equipment_id: UUID
    equipment_name: str
    category: str
    total_hours: float
    operating_hours: float
    idle_hours: float
    utilization_rate: float
    revenue: float
    cost: float
    profit_margin: float


class PricingRecommendation(BaseModel):
    equipment_id: UUID
    current_rate: float
    recommended_rate: float
    change_percentage: float
    reason: str
    demand_level: str  # low, medium, high
    competitor_avg_rate: Optional[float] = None


class JobFitRecommendation(BaseModel):
    job_type: str
    soil_condition: Optional[str] = None
    area_sqm: Optional[float] = None
    depth_m: Optional[float] = None
    duration_days: Optional[int] = None
    recommendations: List[dict] = []  # [{equipment_id, name, fit_score, reason}]


class DashboardSummary(BaseModel):
    total_equipment: int
    available_equipment: int
    active_rentals: int
    total_customers: int
    revenue_this_month: float
    revenue_last_month: float
    revenue_change_pct: float
    avg_utilization_rate: float
    pending_maintenance: int
    active_alerts: int
    top_categories: List[dict] = []
    recent_events: List[dict] = []
