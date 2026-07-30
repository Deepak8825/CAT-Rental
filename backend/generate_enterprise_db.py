"""
Enterprise-Scale Database Generator for Caterpillar Dealer Platform.
Generates 5,000 equipment assets, 1,500 customers, 9,000 rentals, 100,000 telemetry readings,
50,000 daily logs, 3,000 maintenance records, 5,000 events, and 2,000 feedback items.
Fast bulk insertion via SQLAlchemy session.bulk_save_objects.
"""
import os
import sys
import uuid
import random
import time
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.core.auth import hash_password
from app.models.models import (
    Dealer, Customer, Equipment, Site, Rental, DailyLog,
    SensorReading, MaintenanceRecord, Event, Feedback, AdminUser, CustomerProfile,
    EquipmentStatus, RentalStatus, MaintenanceType, EventSeverity
)

# Configuration Constants
REGIONS = ["North", "South", "East", "West", "Central"]

CATEGORIES_CONFIG = {
    "Excavator": {
        "models": ["CAT 320", "CAT 336", "Komatsu PC200", "Volvo EC220", "Liebherr R920"],
        "rate_range": (800, 2500),
        "hp_range": (150, 400),
        "weight_range": (20, 45),
    },
    "Loader": {
        "models": ["CAT 966", "CAT 950", "Komatsu WA380", "Volvo L150"],
        "rate_range": (600, 1800),
        "hp_range": (180, 350),
        "weight_range": (15, 30),
    },
    "Bulldozer": {
        "models": ["CAT D6", "CAT D8", "Komatsu D65", "Shantui SD22"],
        "rate_range": (900, 2800),
        "hp_range": (200, 450),
        "weight_range": (18, 40),
    },
    "Forklift": {
        "models": ["CAT DP50", "Toyota 8FDU30", "Hyster H120", "Yale GDP050"],
        "rate_range": (250, 800),
        "hp_range": (50, 120),
        "weight_range": (3, 8),
    },
    "Motor Grader": {
        "models": ["CAT 140M", "CAT 12M", "Komatsu GD655", "John Deere 672G"],
        "rate_range": (750, 2200),
        "hp_range": (170, 300),
        "weight_range": (14, 22),
    },
    "Compactor": {
        "models": ["CAT CS56B", "Hamm 3411", "BOMAG BW211", "Dynapac CA2500"],
        "rate_range": (400, 1200),
        "hp_range": (100, 180),
        "weight_range": (10, 18),
    },
    "Dump Truck": {
        "models": ["CAT 775G", "Volvo FMX", "Scania P410", "MAN TGS"],
        "rate_range": (700, 2000),
        "hp_range": (350, 600),
        "weight_range": (25, 60),
    },
    "Backhoe Loader": {
        "models": ["CAT 424", "JCB 3CX", "Case 580 Super N", "Mahindra EarthMaster"],
        "rate_range": (350, 950),
        "hp_range": (75, 110),
        "weight_range": (7, 10),
    },
    "Skid Steer": {
        "models": ["CAT 259D3", "Bobcat S650", "Kubota SSV75", "Deere 324G"],
        "rate_range": (200, 650),
        "hp_range": (60, 95),
        "weight_range": (3, 6),
    },
}

COMPANY_SUFFIXES = ["Constructions", "Infrastructure", "Engineering", "BuildCorp", "Logistics", "Earthworks", "Mining Corp"]
FIRST_NAMES = ["Rajesh", "Amit", "Suresh", "Vikram", "Priya", "Neha", "Rohan", "Ananya", "Karan", "Deepak", "Sunil", "Pooja", "Arjun", "Kavita"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Patel", "Singh", "Kumar", "Reddy", "Nair", "Rao", "Joshi", "Deshmukh", "Mehta"]
TECHNICIANS = ["Vijay Kumar", "Ramesh Chand", "Sanjay Singh", "Anil Kapoor", "Dinesh Karthik", "Praveen Sharma"]


def generate_enterprise_database():
    start_time = time.time()
    sync_url = settings.DATABASE_SYNC_URL
    print("==================================================")
    print("Generating Enterprise-Scale Database Target")
    print(f"Connection: {sync_url}")
    print("==================================================")

    engine = create_engine(sync_url)

    # 1. Drop & Recreate all tables
    print("1. Re-creating Database Schemas & Indexes...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 2. Seed Dealers (25 across 5 regions)
        print("2. Generating 25 Enterprise Dealers across 5 Regions...")
        dealers = []
        dealer_ids_by_region = {r: [] for r in REGIONS}
        for i in range(1, 26):
            region = REGIONS[(i - 1) % len(REGIONS)]
            d_id = uuid.uuid4()
            dealer = Dealer(
                id=d_id,
                name=f"Caterpillar Dealer Hub #{i:02d} ({region})",
                region=region,
                address=f"Plot {i * 12}, Industrial Zone, {region} Division",
                latitude=round(20.0 + random.uniform(-5, 5), 4),
                longitude=round(78.0 + random.uniform(-5, 5), 4),
                phone=f"+91 98765 {i:05d}",
                email=f"dealer{i:02d}@catdealer.com",
            )
            dealers.append(dealer)
            dealer_ids_by_region[region].append(d_id)
        session.bulk_save_objects(dealers)
        session.commit()

        # 3. Seed Sites (50 sites)
        print("3. Generating 50 Construction & Work Sites...")
        sites = []
        site_ids = []
        all_dealer_ids = [d.id for d in dealers]
        for i in range(1, 51):
            s_id = uuid.uuid4()
            site_ids.append(s_id)
            d_id = random.choice(all_dealer_ids)
            sites.append(Site(
                id=s_id,
                dealer_id=d_id,
                name=f"Infrastructure Site #{i:02d}",
                address=f"Highway Expansion km {i * 5}",
                city=random.choice(["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"]),
                state="MH",
                latitude=round(19.0 + random.uniform(-4, 4), 4),
                longitude=round(73.0 + random.uniform(-4, 4), 4),
                site_type=random.choice(["highway", "mining", "building", "metro", "bridge"]),
            ))
        session.bulk_save_objects(sites)
        session.commit()

        # 4. Seed Customers (1,500 enterprise customers)
        print("4. Generating 1,500 Enterprise Customers...")
        customers = []
        customer_ids = []
        for i in range(1, 1501):
            c_id = uuid.uuid4()
            customer_ids.append(c_id)
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            comp = f"{ln} {random.choice(COMPANY_SUFFIXES)}"
            customers.append(Customer(
                id=c_id,
                name=f"{fn} {ln}",
                email=f"cust{i:04d}@enterprise{i}.com",
                phone=f"+91 91234 {i:05d}",
                company=comp,
                address=f"Suite {i}, Business Tower, Sector {i % 100}",
                insurance_risk_score=round(random.uniform(20.0, 95.0), 1),
                lifetime_value=round(random.uniform(50000, 2500000), 2),
                total_rentals=random.randint(1, 25),
                password_hash=hash_password("pass123"),
                is_active=True,
            ))
        session.bulk_save_objects(customers)
        session.commit()

        # 5. Seed Equipment (5,000 equipment items)
        print("5. Generating 5,000 Equipment Assets across 9 Categories & 5 Regions...")
        equipment_list = []
        equip_ids_by_status = {"available": [], "rented": [], "maintenance": []}
        all_equip_ids = []
        categories = list(CATEGORIES_CONFIG.keys())

        for i in range(1, 5001):
            e_id = uuid.uuid4()
            all_equip_ids.append(e_id)
            cat = categories[(i - 1) % len(categories)]
            cfg = CATEGORIES_CONFIG[cat]
            model = random.choice(cfg["models"])
            region = REGIONS[(i - 1) % len(REGIONS)]
            d_id = random.choice(dealer_ids_by_region[region])

            # Status distribution: ~70% Rented/Available, ~20% Active Rented, ~10% Maintenance
            roll = random.random()
            if roll < 0.65:
                status = EquipmentStatus.AVAILABLE
                status_str = "available"
            elif roll < 0.88:
                status = EquipmentStatus.RENTED
                status_str = "rented"
            else:
                status = EquipmentStatus.MAINTENANCE
                status_str = "maintenance"

            equip_ids_by_status[status_str].append(e_id)

            daily_rate = float(random.randint(*cfg["rate_range"]))
            equip_obj = Equipment(
                id=e_id,
                dealer_id=d_id,
                name=f"{model} #{i:04d}",
                model=model,
                category=cat,
                subcategory=f"Standard {cat}",
                serial_number=f"CAT-{cat[:3].upper()}-{i:05d}",
                year_manufactured=random.randint(2019, 2025),
                status=status,
                health_score=round(random.uniform(45.0, 100.0), 1),
                daily_rate=daily_rate,
                hourly_rate=round(daily_rate / 8.0, 2),
                latitude=round(20.0 + random.uniform(-5, 5), 4),
                longitude=round(78.0 + random.uniform(-5, 5), 4),
                total_operating_hours=round(random.uniform(200.0, 4500.0), 1),
                fuel_capacity=float(random.randint(150, 600)),
                weight_tons=float(random.randint(*cfg["weight_range"])),
                max_load_capacity=float(random.randint(5, 50)),
                engine_power_hp=float(random.randint(*cfg["hp_range"])),
                last_maintenance_date=(date.today() - timedelta(days=random.randint(10, 120))),
                next_maintenance_due=(date.today() + timedelta(days=random.randint(5, 90))),
            )
            equipment_list.append(equip_obj)

        session.bulk_save_objects(equipment_list)
        session.commit()
        print(f"  - 5,000 equipment seeded (Available: {len(equip_ids_by_status['available'])}, Rented: {len(equip_ids_by_status['rented'])}, Maintenance: {len(equip_ids_by_status['maintenance'])})")

        # 6. Seed Rentals (8,000 Completed + ~1,000 Active = 9,000 total)
        print("6. Generating 9,000 Rentals (~1,000 Active & 8,000 Historical)...")
        rentals = []
        rental_ids = []
        completed_rental_ids = []
        today = date.today()

        # A) Currently Active Rentals (matched with 'rented' equipment assets)
        for e_id in equip_ids_by_status["rented"]:
            r_id = uuid.uuid4()
            rental_ids.append(r_id)
            c_id = random.choice(customer_ids)
            s_id = random.choice(site_ids)
            start_d = today - timedelta(days=random.randint(5, 45))
            end_d = today + timedelta(days=random.randint(10, 60))
            daily = float(random.randint(400, 2200))
            days_count = (end_d - start_d).days

            rentals.append(Rental(
                id=r_id,
                customer_id=c_id,
                equipment_id=e_id,
                site_id=s_id,
                start_date=start_d,
                end_date=end_d,
                daily_rate=daily,
                total_cost=daily * days_count,
                status=RentalStatus.ACTIVE,
                operator_name=random.choice(FIRST_NAMES) + " " + random.choice(LAST_NAMES),
                carbon_footprint_kg=round(random.uniform(1500, 8500), 1),
            ))

        # B) Historical Completed Rentals (8,000)
        for i in range(8000):
            r_id = uuid.uuid4()
            rental_ids.append(r_id)
            completed_rental_ids.append(r_id)
            e_id = random.choice(all_equip_ids)
            c_id = random.choice(customer_ids)
            s_id = random.choice(site_ids)
            start_d = today - timedelta(days=random.randint(60, 365))
            duration = random.randint(3, 30)
            end_d = start_d + timedelta(days=duration)
            daily = float(random.randint(400, 2200))

            rentals.append(Rental(
                id=r_id,
                customer_id=c_id,
                equipment_id=e_id,
                site_id=s_id,
                start_date=start_d,
                end_date=end_d,
                actual_return_date=end_d,
                daily_rate=daily,
                total_cost=daily * duration,
                status=RentalStatus.COMPLETED,
                operator_name=random.choice(FIRST_NAMES) + " " + random.choice(LAST_NAMES),
                carbon_footprint_kg=round(random.uniform(800, 4500), 1),
            ))

        session.bulk_save_objects(rentals)
        session.commit()
        print(f"  - {len(rentals)} rentals seeded ({len(equip_ids_by_status['rented'])} Active, 8,000 Historical).")

        # 7. Seed Daily Operational Logs (50,000)
        print("7. Generating 50,000 Operational Daily Logs...")
        daily_logs = []
        for i in range(50000):
            e_id = random.choice(all_equip_ids)
            op_h = round(random.uniform(4.0, 10.5), 1)
            idle_h = round(random.uniform(0.5, 3.0), 1)
            daily_logs.append(DailyLog(
                id=uuid.uuid4(),
                equipment_id=e_id,
                log_date=today - timedelta(days=random.randint(1, 180)),
                operating_hours=op_h,
                idle_hours=idle_h,
                fuel_consumed_liters=round(op_h * random.uniform(12.0, 28.0), 1),
                distance_km=round(op_h * random.uniform(5.0, 25.0), 1),
                avg_engine_temp=round(random.uniform(80.0, 98.0), 1),
                max_engine_temp=round(random.uniform(95.0, 108.0), 1),
                avg_hydraulic_pressure=round(random.uniform(2500.0, 3200.0), 1),
                avg_battery_voltage=round(random.uniform(11.8, 14.2), 1),
                error_code_count=random.choices([0, 1, 2], weights=[0.85, 0.12, 0.03])[0],
                weather_condition=random.choice(["Sunny", "Clear", "Overcast", "Rainy"]),
                ambient_temp_celsius=round(random.uniform(18.0, 42.0), 1),
                operator_efficiency_score=round(random.uniform(65.0, 98.0), 1),
            ))

        session.bulk_save_objects(daily_logs)
        session.commit()
        print("  - 50,000 daily logs seeded.")

        # 8. Seed Telemetry Sensor Readings (100,000)
        print("8. Generating 100,000 Real-Time Telemetry Readings...")
        sensor_readings = []
        base_time = datetime.utcnow()
        for i in range(100000):
            e_id = random.choice(all_equip_ids)
            is_anom = (random.random() < 0.04)
            sensor_readings.append(SensorReading(
                id=uuid.uuid4(),
                equipment_id=e_id,
                reading_time=base_time - timedelta(minutes=random.randint(1, 14400)),
                engine_temp=round(random.uniform(102.0, 115.0) if is_anom else random.uniform(82.0, 96.0), 1),
                hydraulic_pressure=round(random.uniform(1500.0, 2000.0) if is_anom else random.uniform(2800.0, 3300.0), 1),
                battery_voltage=round(random.uniform(10.5, 11.2) if is_anom else random.uniform(12.2, 14.0), 1),
                fuel_level=round(random.uniform(5.0, 100.0), 1),
                rpm=round(random.uniform(1400.0, 2400.0), 0),
                vibration_level=round(random.uniform(4.5, 8.0) if is_anom else random.uniform(1.2, 3.2), 2),
                oil_pressure=round(random.uniform(20.0, 30.0) if is_anom else random.uniform(40.0, 60.0), 1),
                coolant_temp=round(random.uniform(98.0, 112.0) if is_anom else random.uniform(78.0, 92.0), 1),
                latitude=round(20.0 + random.uniform(-5, 5), 4),
                longitude=round(78.0 + random.uniform(-5, 5), 4),
                speed_kmh=round(random.uniform(0.0, 35.0), 1),
                is_anomaly=is_anom,
                anomaly_score=round(random.uniform(0.75, 0.98) if is_anom else 0.0, 2),
            ))

        session.bulk_save_objects(sensor_readings)
        session.commit()
        print("  - 100,000 telemetry sensor readings seeded.")

        # 9. Seed Maintenance Records (3,000)
        print("9. Generating 3,000 Maintenance Records...")
        maint_records = []
        for i in range(3000):
            e_id = random.choice(all_equip_ids)
            is_comp = (random.random() < 0.60)
            m_type = random.choice([MaintenanceType.SCHEDULED, MaintenanceType.PREDICTIVE, MaintenanceType.EMERGENCY, MaintenanceType.INSPECTION])
            maint_records.append(MaintenanceRecord(
                id=uuid.uuid4(),
                equipment_id=e_id,
                scheduled_date=today + timedelta(days=random.randint(-60, 45)),
                completed_date=today - timedelta(days=random.randint(1, 60)) if is_comp else None,
                maintenance_type=m_type,
                description=f"Standard {m_type.value} maintenance check & filter replacement",
                cost=float(random.randint(250, 3500)),
                technician_name=random.choice(TECHNICIANS),
                predicted_failure_component=random.choice(["Hydraulic Pump", "Engine Valve", "Alternator", "Brake Pad", "Fuel Injector"]),
                ml_confidence_score=round(random.uniform(0.72, 0.96), 2),
                downtime_hours=float(random.randint(2, 24)),
                is_completed=is_comp,
            ))

        session.bulk_save_objects(maint_records)
        session.commit()
        print("  - 3,000 maintenance records seeded.")

        # 10. Seed Events (5,000)
        print("10. Generating 5,000 System Event Alerts...")
        events = []
        event_types = ["temperature_alert", "geofence_breach", "pressure_drop", "battery_warning", "service_overdue"]
        for i in range(5000):
            e_id = random.choice(all_equip_ids)
            e_type = random.choice(event_types)
            sev = random.choice([EventSeverity.INFO, EventSeverity.WARNING, EventSeverity.CRITICAL])
            events.append(Event(
                id=uuid.uuid4(),
                equipment_id=e_id,
                event_type=e_type,
                severity=sev,
                title=f"{sev.value.upper()}: {e_type.replace('_', ' ').title()}",
                description=f"System detected abnormal status for equipment component",
                is_acknowledged=(random.random() < 0.40),
                event_time=base_time - timedelta(minutes=random.randint(5, 20000)),
            ))

        session.bulk_save_objects(events)
        session.commit()
        print("  - 5,000 event alerts seeded.")

        # 11. Seed Feedback Records (2,000)
        print("11. Generating 2,000 Customer Feedback Records...")
        feedback_list = []
        for i in range(2000):
            c_id = random.choice(customer_ids)
            r_id = random.choice(completed_rental_ids)
            rating = random.choices([5, 4, 3, 2, 1], weights=[0.55, 0.25, 0.10, 0.06, 0.04])[0]
            feedback_list.append(Feedback(
                id=uuid.uuid4(),
                customer_id=c_id,
                rental_id=r_id,
                rating=rating,
                comment=f"Rating {rating}/5 - {'Excellent machine performance' if rating >= 4 else 'Satisfactory service' if rating == 3 else 'Equipment required early maintenance'}",
                sentiment_score=round(0.2 * rating, 2),
            ))

        session.bulk_save_objects(feedback_list)
        session.commit()
        print("  - 2,000 customer feedback records seeded.")

        # 12. Seed Default Auth Accounts
        print("12. Creating Default Auth Accounts (admin01@gmail.com & user01@gmail.com)...")
        session.add(AdminUser(
            name="Fleet Administrator",
            email="admin01@gmail.com",
            password_hash=hash_password("passadmin123"),
            role="admin",
        ))

        demo_cust = Customer(
            name="User 01",
            email="user01@gmail.com",
            password_hash=hash_password("pass123"),
            company="Caterpillar Enterprise Rentals",
            phone="+91 98765 43210",
            is_active=True,
        )
        session.add(demo_cust)
        session.commit()
        session.refresh(demo_cust)

        session.add(CustomerProfile(
            customer_id=demo_cust.id,
            business_type="construction",
            gst_number="22AAAAA0000A1Z5",
            billing_address="123 Industrial Area, Sector 62, Noida",
            profile_completed=True,
        ))
        session.commit()
        print("  - Accounts ready: admin01@gmail.com (passadmin123) & user01@gmail.com (pass123)")

        elapsed = round(time.time() - start_time, 2)
        print("==================================================")
        print(f"[SUCCESS] ENTERPRISE DATABASE SEEDED SUCCESSFULLY IN {elapsed}s!")
        print("==================================================")

    except Exception as e:
        session.rollback()
        print(f"[ERROR] Error seeding enterprise database: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    generate_enterprise_database()
