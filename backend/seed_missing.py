import os
import sys
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.database import Base
from app.models.models import (
    Dealer, Customer, Equipment, Site, Rental, DailyLog,
    SensorReading, MaintenanceRecord, Event, Feedback, AdminUser, CustomerProfile
)
from seed_db import parse_uuid, parse_date, parse_dt

def seed_missing():
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "synthetic"))
    engine = create_engine(settings.DATABASE_SYNC_URL)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        equip_df = pd.read_csv(os.path.join(data_dir, "equipment.csv"))
        valid_equip_ids = set(equip_df["id"])

        # Clear empty or unmatched logs/sensors/maint
        session.query(DailyLog).delete()
        session.query(SensorReading).delete()
        session.query(MaintenanceRecord).delete()
        session.commit()

        print("Seeding Daily Logs (matching equipment)...")
        daily_logs_df = pd.read_csv(os.path.join(data_dir, "daily_logs.csv"))
        matching_logs = daily_logs_df[daily_logs_df["equipment_id"].isin(valid_equip_ids)].head(5000)
        for _, row in matching_logs.iterrows():
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
        print(f"  - {len(matching_logs)} daily logs seeded.")

        print("Seeding Sensor Readings (matching equipment)...")
        sensor_df = pd.read_csv(os.path.join(data_dir, "sensor_readings.csv"))
        matching_sensor = sensor_df[sensor_df["equipment_id"].isin(valid_equip_ids)].head(3000)
        for _, row in matching_sensor.iterrows():
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
        print(f"  - {len(matching_sensor)} sensor readings seeded.")

        print("Seeding Maintenance Records (matching equipment)...")
        maint_df = pd.read_csv(os.path.join(data_dir, "maintenance_records.csv"))
        matching_maint = maint_df[maint_df["equipment_id"].isin(valid_equip_ids)].head(1500)
        for _, row in matching_maint.iterrows():
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
        print(f"  - {len(matching_maint)} maintenance records seeded.")

        if session.query(Feedback).count() == 0:
            print("Seeding Feedback...")
            feed_df = pd.read_csv(os.path.join(data_dir, "feedback.csv")).head(1000)
            for _, row in feed_df.iterrows():
                session.add(Feedback(
                    id=parse_uuid(row["id"]),
                    customer_id=parse_uuid(row["customer_id"]),
                    rental_id=parse_uuid(row.get("rental_id")),
                    rating=int(row.get("rating", 5)),
                    comment=row.get("comment"),
                    sentiment_score=float(row.get("sentiment_score", 0.8)),
                ))
            session.commit()
            print("  - Feedback seeded.")

        print("Seeding seed-admin endpoint default accounts...")
        from app.core.auth import hash_password
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
        print("  - Admin & Customer accounts seeded successfully.")
    finally:
        session.close()

if __name__ == "__main__":
    seed_missing()
