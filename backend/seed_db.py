"""
Seeder script to populate SQLite database with generated synthetic data.
"""
import os
import sys
import uuid
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.database import Base
from app.models.models import (
    Dealer, Customer, Equipment, Site, Rental, DailyLog,
    SensorReading, MaintenanceRecord, Event, Feedback
)

def parse_dt(val):
    if pd.isna(val) or not val:
        return None
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except Exception:
            try:
                return datetime.strptime(val, "%Y-%m-%d")
            except Exception:
                return None
    return val

def parse_date(val):
    dt = parse_dt(val)
    return dt.date() if dt else None

def parse_uuid(val):
    if pd.isna(val) or not val:
        return None
    if isinstance(val, str):
        return uuid.UUID(val)
    return val

def seed():
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "synthetic"))
    if not os.path.exists(data_dir):
        print(f"Data directory {data_dir} does not exist.")
        return

    sync_url = settings.DATABASE_SYNC_URL
    print(f"Connecting to DB: {sync_url}")
    engine = create_engine(sync_url)
    Base.metadata.create_all(engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if equipment exists
        if session.query(Equipment).count() > 0:
            print("Database already contains data, skipping seed.")
            return

        print("Seeding Dealers...")
        dealers_df = pd.read_csv(os.path.join(data_dir, "dealers.csv"))
        for _, row in dealers_df.iterrows():
            session.add(Dealer(
                id=parse_uuid(row["id"]),
                name=row["name"],
                region=row["region"],
                address=row.get("address"),
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                phone=row.get("phone"),
                email=row.get("email"),
            ))
        session.commit()
        print(f"  ✓ {len(dealers_df)} dealers seeded.")

        print("Seeding Sites...")
        sites_df = pd.read_csv(os.path.join(data_dir, "sites.csv"))
        for _, row in sites_df.iterrows():
            session.add(Site(
                id=parse_uuid(row["id"]),
                dealer_id=parse_uuid(row["dealer_id"]),
                name=row["name"],
                address=row.get("address"),
                city=row.get("city"),
                state=row.get("state"),
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                site_type=row.get("site_type"),
            ))
        session.commit()
        print(f"  ✓ {len(sites_df)} sites seeded.")

        print("Seeding Customers...")
        cust_df = pd.read_csv(os.path.join(data_dir, "customers.csv"))
        for _, row in cust_df.iterrows():
            session.add(Customer(
                id=parse_uuid(row["id"]),
                name=row["name"],
                email=row["email"],
                phone=str(row.get("phone")),
                company=row.get("company"),
                address=row.get("address"),
                insurance_risk_score=float(row["insurance_risk_score"]) if pd.notna(row.get("insurance_risk_score")) else 50.0,
                lifetime_value=float(row["lifetime_value"]) if pd.notna(row.get("lifetime_value")) else 0.0,
                total_rentals=int(row["total_rentals"]) if pd.notna(row.get("total_rentals")) else 0,
            ))
        session.commit()
        print(f"  ✓ {len(cust_df)} customers seeded.")

        print("Seeding Equipment...")
        equip_df = pd.read_csv(os.path.join(data_dir, "equipment.csv"))
        for _, row in equip_df.iterrows():
            session.add(Equipment(
                id=parse_uuid(row["id"]),
                dealer_id=parse_uuid(row["dealer_id"]),
                name=row["name"],
                model=row["model"],
                category=row["category"],
                subcategory=row.get("subcategory"),
                serial_number=row["serial_number"],
                year_manufactured=int(row["year_manufactured"]) if pd.notna(row.get("year_manufactured")) else 2022,
                status=row["status"],
                health_score=float(row["health_score"]) if pd.notna(row.get("health_score")) else 100.0,
                daily_rate=float(row["daily_rate"]),
                hourly_rate=float(row["hourly_rate"]) if pd.notna(row.get("hourly_rate")) else float(row["daily_rate"]) / 8.0,
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                total_operating_hours=float(row["total_operating_hours"]) if pd.notna(row.get("total_operating_hours")) else 0.0,
                fuel_capacity=float(row["fuel_capacity"]) if pd.notna(row.get("fuel_capacity")) else None,
                weight_tons=float(row["weight_tons"]) if pd.notna(row.get("weight_tons")) else None,
                max_load_capacity=float(row["max_load_capacity"]) if pd.notna(row.get("max_load_capacity")) else None,
                engine_power_hp=float(row["engine_power_hp"]) if pd.notna(row.get("engine_power_hp")) else None,
                last_maintenance_date=parse_date(row.get("last_maintenance_date")),
                next_maintenance_due=parse_date(row.get("next_maintenance_due")),
            ))
        session.commit()
        print(f"  ✓ {len(equip_df)} equipment items seeded.")

        print("Seeding Rentals...")
        rent_df = pd.read_csv(os.path.join(data_dir, "rentals.csv"))
        # Seed up to 2000 rentals for performance
        sample_rent = rent_df.head(2000)
        for _, row in sample_rent.iterrows():
            session.add(Rental(
                id=parse_uuid(row["id"]),
                customer_id=parse_uuid(row["customer_id"]),
                equipment_id=parse_uuid(row["equipment_id"]),
                site_id=parse_uuid(row.get("site_id")),
                start_date=parse_date(row["start_date"]),
                end_date=parse_date(row.get("end_date")),
                actual_return_date=parse_date(row.get("actual_return_date")),
                daily_rate=float(row["daily_rate"]),
                total_cost=float(row["total_cost"]) if pd.notna(row.get("total_cost")) else None,
                status=row["status"],
                operator_name=row.get("operator_name"),
                carbon_footprint_kg=float(row["carbon_footprint_kg"]) if pd.notna(row.get("carbon_footprint_kg")) else 0.0,
            ))
        session.commit()
        print(f"  ✓ {len(sample_rent)} rentals seeded.")

        print("Seeding Events...")
        event_df = pd.read_csv(os.path.join(data_dir, "events.csv"))
        sample_events = event_df.head(1000)
        for _, row in sample_events.iterrows():
            session.add(Event(
                id=parse_uuid(row["id"]),
                equipment_id=parse_uuid(row.get("equipment_id")),
                event_type=row["event_type"],
                severity=row["severity"],
                title=row.get("title"),
                description=row.get("description"),
                is_acknowledged=bool(row.get("is_acknowledged", False)),
                event_time=parse_dt(row.get("event_time")),
            ))
        session.commit()
        print(f"  ✓ {len(sample_events)} events seeded.")

        print("Seeding Daily Logs...")
        daily_logs_df = pd.read_csv(os.path.join(data_dir, "daily_logs.csv"))
        sample_logs = daily_logs_df.head(3000)
        for _, row in sample_logs.iterrows():
            session.add(DailyLog(
                id=parse_uuid(row["id"]),
                equipment_id=parse_uuid(row["equipment_id"]),
                rental_id=parse_uuid(row.get("rental_id")),
                log_date=parse_date(row["log_date"]),
                operating_hours=float(row.get("operating_hours", 0)),
                idle_hours=float(row.get("idle_hours", 0)),
                fuel_consumed_liters=float(row.get("fuel_consumed_liters", 0)),
                distance_km=float(row.get("distance_km", 0)),
                avg_engine_temp=float(row.get("avg_engine_temp", 85)),
                max_engine_temp=float(row.get("max_engine_temp", 95)),
                avg_hydraulic_pressure=float(row.get("avg_hydraulic_pressure", 3000)),
                avg_battery_voltage=float(row.get("avg_battery_voltage", 12.6)),
                error_code_count=int(row.get("error_code_count", 0)),
                weather_condition=row.get("weather_condition"),
                ambient_temp_celsius=float(row.get("ambient_temp_celsius", 25)),
                operator_efficiency_score=float(row.get("operator_efficiency_score", 80)),
            ))
        session.commit()
        print(f"  ✓ {len(sample_logs)} daily logs seeded.")

        print("Seeding Sensor Readings...")
        sensor_df = pd.read_csv(os.path.join(data_dir, "sensor_readings.csv"))
        sample_sensor = sensor_df.head(2000)
        for _, row in sample_sensor.iterrows():
            session.add(SensorReading(
                id=parse_uuid(row["id"]),
                equipment_id=parse_uuid(row["equipment_id"]),
                reading_time=parse_dt(row.get("reading_time")),
                engine_temp=float(row.get("engine_temp", 85)),
                hydraulic_pressure=float(row.get("hydraulic_pressure", 3000)),
                battery_voltage=float(row.get("battery_voltage", 12.6)),
                fuel_level=float(row.get("fuel_level", 80)),
                rpm=float(row.get("rpm", 1800)),
                vibration_level=float(row.get("vibration_level", 2.5)),
                oil_pressure=float(row.get("oil_pressure", 45)),
                coolant_temp=float(row.get("coolant_temp", 80)),
                latitude=float(row.get("latitude")) if pd.notna(row.get("latitude")) else None,
                longitude=float(row.get("longitude")) if pd.notna(row.get("longitude")) else None,
                speed_kmh=float(row.get("speed_kmh", 0)),
                is_anomaly=bool(row.get("is_anomaly", False)),
                anomaly_score=float(row.get("anomaly_score", 0.0)),
            ))
        session.commit()
        print(f"  ✓ {len(sample_sensor)} sensor readings seeded.")

        print("Seeding Maintenance Records...")
        maint_df = pd.read_csv(os.path.join(data_dir, "maintenance_records.csv"))
        sample_maint = maint_df.head(1000)
        for _, row in sample_maint.iterrows():
            session.add(MaintenanceRecord(
                id=parse_uuid(row["id"]),
                equipment_id=parse_uuid(row["equipment_id"]),
                scheduled_date=parse_date(row["scheduled_date"]),
                completed_date=parse_date(row.get("completed_date")),
                maintenance_type=row.get("maintenance_type", "scheduled"),
                description=row.get("description"),
                cost=float(row.get("cost", 0)),
                technician_name=row.get("technician_name"),
                predicted_failure_component=row.get("predicted_failure_component"),
                ml_confidence_score=float(row.get("ml_confidence_score")) if pd.notna(row.get("ml_confidence_score")) else None,
                downtime_hours=float(row.get("downtime_hours", 0)),
                is_completed=bool(row.get("is_completed", False)),
            ))
        session.commit()
        print(f"  ✓ {len(sample_maint)} maintenance records seeded.")

        print("Seeding Admin & Demo User Accounts...")
        from app.core.auth import hash_password
        from app.models.models import AdminUser, CustomerProfile

        admin = session.query(AdminUser).filter_by(email="admin01@gmail.com").first()
        if not admin:
            session.add(AdminUser(
                name="Fleet Administrator",
                email="admin01@gmail.com",
                password_hash=hash_password("passadmin123"),
                role="admin",
            ))

        user = session.query(Customer).filter_by(email="user01@gmail.com").first()
        if not user:
            user = Customer(
                name="User 01",
                email="user01@gmail.com",
                password_hash=hash_password("pass123"),
                company="Caterpillar Rentals Inc",
                phone="+91 98765 43210",
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            session.add(CustomerProfile(
                customer_id=user.id,
                business_type="construction",
                gst_number="22AAAAA0000A1Z5",
                billing_address="123 Industrial Area, Sector 62, Noida",
                profile_completed=True,
            ))

        session.commit()
        print("  ✓ Admin (admin01@gmail.com) and Customer (user01@gmail.com) accounts seeded.")

        print("All database seed operations completed successfully!")
    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    seed()

