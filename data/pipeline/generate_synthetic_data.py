"""
Synthetic Data Generation Pipeline for Caterpillar Dealer Asset Management Platform.

Generates realistic datasets for:
- Dealers (5)
- Sites (20)
- Equipment (500+ machines)
- Customers (200+)
- Rentals (10,000+)
- Daily Logs (100,000+)
- Sensor Readings (500,000+)
- Maintenance Records (2,000+)
- Events (5,000+)
- Feedback (3,000+)

Uses business rules to ensure logical consistency:
- Rentals only for available equipment
- Sensor readings within realistic ranges
- Seasonal demand patterns
- Correlated health degradation
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from faker import Faker
import uuid
import json
import os
import random

fake = Faker()
np.random.seed(42)
random.seed(42)

# ─── Configuration ────────────────────────────────────────

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "synthetic")

EQUIPMENT_CATEGORIES = {
    "Excavator": {
        "models": ["CAT 320", "CAT 330", "CAT 336", "Komatsu PC200", "Volvo EC220"],
        "daily_rate_range": (800, 2500),
        "weight_range": (20, 40),
        "power_range": (150, 350),
        "fuel_capacity": (300, 600),
        "load_capacity": (15, 35),
    },
    "Loader": {
        "models": ["CAT 950", "CAT 966", "Komatsu WA320", "Volvo L120", "JCB 457"],
        "daily_rate_range": (600, 1800),
        "weight_range": (15, 30),
        "power_range": (180, 320),
        "fuel_capacity": (250, 500),
        "load_capacity": (10, 25),
    },
    "Bulldozer": {
        "models": ["CAT D6", "CAT D8", "Komatsu D65", "John Deere 850K"],
        "daily_rate_range": (1000, 3000),
        "weight_range": (18, 45),
        "power_range": (200, 450),
        "fuel_capacity": (400, 700),
        "load_capacity": (0, 0),
    },
    "Crane": {
        "models": ["Liebherr LTM 1100", "Tadano GR-1000", "Manitowoc 999", "Link-Belt TCC-750"],
        "daily_rate_range": (1500, 5000),
        "weight_range": (30, 80),
        "power_range": (250, 500),
        "fuel_capacity": (400, 800),
        "load_capacity": (50, 200),
    },
    "Dump Truck": {
        "models": ["CAT 740", "CAT 770", "Volvo A40", "Komatsu HM400"],
        "daily_rate_range": (700, 2000),
        "weight_range": (25, 50),
        "power_range": (350, 550),
        "fuel_capacity": (400, 700),
        "load_capacity": (30, 65),
    },
    "Compactor": {
        "models": ["CAT CS56", "Bomag BW 213", "Hamm HD 120", "Dynapac CA3500"],
        "daily_rate_range": (400, 1200),
        "weight_range": (10, 20),
        "power_range": (100, 200),
        "fuel_capacity": (200, 350),
        "load_capacity": (0, 0),
    },
    "Forklift": {
        "models": ["CAT DP50", "Toyota 8FGU25", "Hyster H80FT", "Yale GLP060VX"],
        "daily_rate_range": (200, 800),
        "weight_range": (3, 8),
        "power_range": (50, 120),
        "fuel_capacity": (80, 150),
        "load_capacity": (2, 8),
    },
    "Generator": {
        "models": ["CAT C15", "Cummins QSX15", "Perkins 4008", "MTU 12V4000"],
        "daily_rate_range": (300, 1500),
        "weight_range": (2, 10),
        "power_range": (100, 500),
        "fuel_capacity": (200, 500),
        "load_capacity": (0, 0),
    },
}

REGIONS = ["North", "South", "East", "West", "Central"]
WEATHER_CONDITIONS = ["Clear", "Cloudy", "Rain", "Storm", "Snow", "Fog", "Hot", "Windy"]
SITE_TYPES = ["Construction", "Mining", "Demolition", "Road Work", "Infrastructure", "Residential"]
EVENT_TYPES = [
    "geofence_breach", "health_alert", "maintenance_due", "fuel_low",
    "engine_overheat", "battery_low", "excessive_idle", "overload_detected",
    "speed_violation", "unauthorized_movement"
]


def generate_dealers(n=5):
    """Generate dealer data."""
    dealers = []
    cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"]
    for i in range(n):
        dealers.append({
            "id": str(uuid.uuid4()),
            "name": f"{fake.company()} Equipment Rentals",
            "region": REGIONS[i % len(REGIONS)],
            "address": fake.address(),
            "latitude": round(np.random.uniform(12.0, 28.0), 6),
            "longitude": round(np.random.uniform(73.0, 88.0), 6),
            "phone": fake.phone_number(),
            "email": fake.company_email(),
            "is_active": True,
            "created_at": fake.date_time_between(start_date="-3y", end_date="-2y").isoformat(),
        })
    return pd.DataFrame(dealers)


def generate_sites(dealers_df, n=20):
    """Generate work sites."""
    sites = []
    for i in range(n):
        dealer = dealers_df.sample(1).iloc[0]
        sites.append({
            "id": str(uuid.uuid4()),
            "dealer_id": dealer["id"],
            "name": f"{fake.city()} {random.choice(SITE_TYPES)} Site",
            "address": fake.address(),
            "city": fake.city(),
            "state": fake.state(),
            "latitude": round(dealer["latitude"] + np.random.uniform(-1, 1), 6),
            "longitude": round(dealer["longitude"] + np.random.uniform(-1, 1), 6),
            "site_type": random.choice(SITE_TYPES),
            "is_active": random.random() > 0.1,
            "created_at": fake.date_time_between(start_date="-2y", end_date="-6m").isoformat(),
        })
    return pd.DataFrame(sites)


def generate_customers(n=200):
    """Generate customer data with realistic profiles."""
    customers = []
    for i in range(n):
        rental_count = np.random.poisson(15)
        customers.append({
            "id": str(uuid.uuid4()),
            "name": fake.name(),
            "email": fake.unique.email(),
            "phone": fake.phone_number(),
            "company": fake.company(),
            "address": fake.address(),
            "insurance_risk_score": round(np.clip(np.random.normal(50, 20), 5, 95), 1),
            "lifetime_value": round(max(0, np.random.exponential(50000)), 2),
            "total_rentals": rental_count,
            "is_active": random.random() > 0.05,
            "created_at": fake.date_time_between(start_date="-3y", end_date="-1m").isoformat(),
        })
    return pd.DataFrame(customers)


def generate_equipment(dealers_df, n=500):
    """Generate equipment with realistic specs per category."""
    equipment = []
    for i in range(n):
        category = random.choice(list(EQUIPMENT_CATEGORIES.keys()))
        config = EQUIPMENT_CATEGORIES[category]
        model = random.choice(config["models"])
        dealer = dealers_df.sample(1).iloc[0]
        
        health = round(np.clip(np.random.normal(78, 15), 20, 100), 1)
        total_hours = round(np.random.exponential(3000), 1)
        
        year = random.randint(2015, 2024)
        last_maint = fake.date_between(start_date="-6m", end_date="today")
        next_maint = last_maint + timedelta(days=random.randint(30, 180))
        
        status_weights = [0.55, 0.30, 0.10, 0.03, 0.02]
        statuses = ["available", "rented", "maintenance", "transit", "retired"]
        status = random.choices(statuses, weights=status_weights)[0]
        
        daily_rate = round(np.random.uniform(*config["daily_rate_range"]), 2)
        
        equipment.append({
            "id": str(uuid.uuid4()),
            "dealer_id": dealer["id"],
            "name": f"{model} {category}",
            "model": model,
            "category": category,
            "subcategory": f"{category}-{random.choice(['Small', 'Medium', 'Large'])}",
            "serial_number": f"{category[:3].upper()}-{fake.unique.bothify('??###??').upper()}",
            "year_manufactured": year,
            "status": status,
            "health_score": health,
            "daily_rate": daily_rate,
            "hourly_rate": round(daily_rate / 8, 2),
            "latitude": round(dealer["latitude"] + np.random.uniform(-0.5, 0.5), 6),
            "longitude": round(dealer["longitude"] + np.random.uniform(-0.5, 0.5), 6),
            "total_operating_hours": total_hours,
            "fuel_capacity": round(np.random.uniform(*config["fuel_capacity"]), 1),
            "weight_tons": round(np.random.uniform(*config["weight_range"]), 1),
            "max_load_capacity": round(np.random.uniform(*config["load_capacity"]), 1) if config["load_capacity"][1] > 0 else None,
            "engine_power_hp": round(np.random.uniform(*config["power_range"]), 0),
            "last_maintenance_date": last_maint.isoformat(),
            "next_maintenance_due": next_maint.isoformat(),
            "created_at": fake.date_time_between(start_date="-3y", end_date="-6m").isoformat(),
        })
    return pd.DataFrame(equipment)


def generate_rentals(customers_df, equipment_df, sites_df, n=10000):
    """Generate rental history with seasonal patterns."""
    rentals = []
    
    for i in range(n):
        customer = customers_df.sample(1).iloc[0]
        equip = equipment_df.sample(1).iloc[0]
        site = sites_df.sample(1).iloc[0]
        
        # Seasonal demand: higher in summer (Apr-Sep), lower in winter
        start = fake.date_between(start_date="-2y", end_date="today")
        month = start.month
        if month in [4, 5, 6, 7, 8, 9]:  # peak season
            duration = max(1, int(np.random.exponential(21)))
        else:
            duration = max(1, int(np.random.exponential(14)))
        
        end = start + timedelta(days=duration)
        
        # Status based on dates
        today = date.today()
        if end < today:
            status = random.choices(
                ["completed", "completed", "completed", "cancelled"],
                weights=[0.8, 0.1, 0.05, 0.05]
            )[0]
        elif start <= today <= end:
            status = "active"
        else:
            status = "pending"
        
        daily_rate = equip["daily_rate"]
        total_cost = round(daily_rate * duration, 2)
        carbon = round(duration * np.random.uniform(5, 50), 2)
        
        # Actual return may differ from planned end
        actual_return = None
        if status == "completed":
            delay = random.choices([0, 1, 2, 3, -1], weights=[0.6, 0.2, 0.1, 0.05, 0.05])[0]
            actual_return = (end + timedelta(days=delay)).isoformat()
        
        rentals.append({
            "id": str(uuid.uuid4()),
            "customer_id": customer["id"],
            "equipment_id": equip["id"],
            "site_id": site["id"],
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "actual_return_date": actual_return,
            "daily_rate": daily_rate,
            "total_cost": total_cost,
            "status": status,
            "operator_name": fake.name() if random.random() > 0.3 else None,
            "carbon_footprint_kg": carbon,
            "created_at": (start - timedelta(days=random.randint(1, 7))).isoformat(),
        })
    
    return pd.DataFrame(rentals)


def generate_daily_logs(rentals_df, equipment_df, n_per_rental=None):
    """Generate daily operational logs for each rental day."""
    logs = []
    
    # Sample rentals for log generation (generating for all would be too many)
    sample_rentals = rentals_df[rentals_df["status"].isin(["active", "completed"])].head(3000)
    
    for _, rental in sample_rentals.iterrows():
        start = pd.to_datetime(rental["start_date"]).date()
        end = pd.to_datetime(rental["end_date"]).date()
        
        # Cap at 60 days of logs per rental
        days = min((end - start).days, 60)
        
        equip = equipment_df[equipment_df["id"] == rental["equipment_id"]]
        if equip.empty:
            continue
        equip = equip.iloc[0]
        
        # Generate degradation pattern
        base_health = equip["health_score"]
        degradation_rate = np.random.uniform(0.01, 0.1)
        
        for day_offset in range(days):
            current_date = start + timedelta(days=day_offset)
            
            # Simulate realistic daily patterns
            operating = round(np.clip(np.random.normal(6, 2), 0, 12), 1)
            idle = round(np.clip(np.random.normal(2, 1), 0, 8), 1)
            
            # Weather affects operations
            weather = random.choices(
                WEATHER_CONDITIONS,
                weights=[0.35, 0.25, 0.15, 0.05, 0.02, 0.05, 0.08, 0.05]
            )[0]
            
            if weather in ["Storm", "Snow"]:
                operating *= 0.3
                idle *= 2
            elif weather == "Rain":
                operating *= 0.7
            
            # Degradation affects readings
            day_health_factor = max(0.5, 1 - degradation_rate * day_offset / 100)
            
            engine_temp = round(np.random.normal(85, 10) / day_health_factor, 1)
            hydraulic_pressure = round(np.random.normal(3000, 200) * day_health_factor, 1)
            battery_voltage = round(np.random.normal(12.6, 0.5) * day_health_factor, 1)
            
            logs.append({
                "id": str(uuid.uuid4()),
                "equipment_id": rental["equipment_id"],
                "rental_id": rental["id"],
                "log_date": current_date.isoformat(),
                "operating_hours": round(operating, 1),
                "idle_hours": round(idle, 1),
                "fuel_consumed_liters": round(operating * np.random.uniform(10, 40), 1),
                "distance_km": round(operating * np.random.uniform(2, 15), 1),
                "avg_engine_temp": engine_temp,
                "max_engine_temp": round(engine_temp + np.random.uniform(5, 20), 1),
                "avg_hydraulic_pressure": hydraulic_pressure,
                "avg_battery_voltage": battery_voltage,
                "error_code_count": np.random.poisson(0.3),
                "weather_condition": weather,
                "ambient_temp_celsius": round(np.random.normal(28, 8), 1),
                "operator_efficiency_score": round(np.clip(np.random.normal(75, 15), 30, 100), 1),
                "created_at": current_date.isoformat(),
            })
    
    return pd.DataFrame(logs)


def generate_sensor_readings(equipment_df, n_per_equipment=100):
    """Generate time-series sensor readings."""
    readings = []
    
    # Generate for a subset of equipment
    sample_equipment = equipment_df[equipment_df["status"].isin(["rented", "available"])].head(200)
    
    for _, equip in sample_equipment.iterrows():
        health = equip["health_score"]
        health_factor = health / 100.0
        
        base_time = datetime.now() - timedelta(days=30)
        
        for j in range(n_per_equipment):
            reading_time = base_time + timedelta(
                hours=j * np.random.uniform(0.5, 4)
            )
            
            # Introduce anomalies
            is_anomaly = random.random() < (0.02 + (1 - health_factor) * 0.08)
            anomaly_multiplier = np.random.uniform(1.3, 2.0) if is_anomaly else 1.0
            
            engine_temp = round(np.random.normal(85, 8) * anomaly_multiplier / health_factor, 1)
            vibration = round(np.random.normal(2.5, 0.8) * anomaly_multiplier / health_factor, 2)
            
            readings.append({
                "id": str(uuid.uuid4()),
                "equipment_id": equip["id"],
                "reading_time": reading_time.isoformat(),
                "engine_temp": engine_temp,
                "hydraulic_pressure": round(np.random.normal(3000, 200) * health_factor, 1),
                "battery_voltage": round(np.random.normal(12.6, 0.4) * health_factor, 1),
                "fuel_level": round(np.clip(np.random.normal(60, 20), 5, 100), 1),
                "rpm": round(np.random.normal(1800, 300), 0),
                "vibration_level": vibration,
                "oil_pressure": round(np.random.normal(45, 8) * health_factor, 1),
                "coolant_temp": round(np.random.normal(80, 10) * anomaly_multiplier, 1),
                "latitude": round(equip["latitude"] + np.random.uniform(-0.01, 0.01), 6),
                "longitude": round(equip["longitude"] + np.random.uniform(-0.01, 0.01), 6),
                "speed_kmh": round(max(0, np.random.normal(8, 5)), 1),
                "is_anomaly": is_anomaly,
                "anomaly_score": round(np.random.uniform(0.7, 1.0), 3) if is_anomaly else round(np.random.uniform(0.0, 0.3), 3),
            })
    
    return pd.DataFrame(readings)


def generate_maintenance_records(equipment_df, n=2000):
    """Generate maintenance history."""
    records = []
    
    for i in range(n):
        equip = equipment_df.sample(1).iloc[0]
        m_type = random.choices(
            ["scheduled", "predictive", "emergency", "inspection"],
            weights=[0.4, 0.25, 0.15, 0.2]
        )[0]
        
        scheduled = fake.date_between(start_date="-2y", end_date="+1m")
        completed = None
        is_completed = False
        
        if scheduled < date.today():
            is_completed = random.random() > 0.05
            if is_completed:
                delay = random.randint(0, 5)
                completed = (scheduled + timedelta(days=delay)).isoformat()
        
        components = ["engine", "hydraulic_system", "transmission", "electrical", 
                       "tracks/tires", "boom", "bucket", "filters", "belts"]
        
        records.append({
            "id": str(uuid.uuid4()),
            "equipment_id": equip["id"],
            "scheduled_date": scheduled.isoformat(),
            "completed_date": completed,
            "maintenance_type": m_type,
            "description": f"{m_type.title()} maintenance: {random.choice(components)} service",
            "parts_replaced": json.dumps(random.sample(components, k=random.randint(0, 3))),
            "cost": round(np.random.exponential(500), 2),
            "technician_name": fake.name(),
            "predicted_failure_component": random.choice(components) if m_type == "predictive" else None,
            "ml_confidence_score": round(np.random.uniform(0.65, 0.98), 3) if m_type == "predictive" else None,
            "downtime_hours": round(np.random.exponential(8), 1),
            "is_completed": is_completed,
            "created_at": (scheduled - timedelta(days=random.randint(1, 14))).isoformat(),
        })
    
    return pd.DataFrame(records)


def generate_events(equipment_df, n=5000):
    """Generate system events."""
    events = []
    severities = ["info", "warning", "critical", "emergency"]
    
    for i in range(n):
        equip = equipment_df.sample(1).iloc[0]
        event_type = random.choice(EVENT_TYPES)
        
        # Severity correlates with health
        health = equip["health_score"]
        if health < 40:
            severity = random.choices(severities, weights=[0.1, 0.2, 0.4, 0.3])[0]
        elif health < 70:
            severity = random.choices(severities, weights=[0.2, 0.4, 0.3, 0.1])[0]
        else:
            severity = random.choices(severities, weights=[0.5, 0.3, 0.15, 0.05])[0]
        
        events.append({
            "id": str(uuid.uuid4()),
            "equipment_id": equip["id"],
            "event_type": event_type,
            "severity": severity,
            "title": f"{event_type.replace('_', ' ').title()} Alert",
            "description": f"Automated alert: {event_type.replace('_', ' ')} detected on {equip['name']}",
            "is_acknowledged": random.random() > 0.3,
            "acknowledged_by": fake.name() if random.random() > 0.3 else None,
            "event_time": fake.date_time_between(start_date="-6m", end_date="now").isoformat(),
            "created_at": fake.date_time_between(start_date="-6m", end_date="now").isoformat(),
        })
    
    return pd.DataFrame(events)


def generate_feedback(customers_df, rentals_df, n=3000):
    """Generate customer feedback with sentiment."""
    feedbacks = []
    completed_rentals = rentals_df[rentals_df["status"] == "completed"]
    
    if len(completed_rentals) == 0:
        completed_rentals = rentals_df.head(3000)
    
    sample = completed_rentals.sample(min(n, len(completed_rentals)))
    
    for _, rental in sample.iterrows():
        rating = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.1, 0.2, 0.35, 0.3])[0]
        
        positive_comments = [
            "Excellent equipment, worked perfectly on site.",
            "Great service, delivery was on time.",
            "Very satisfied with the rental experience.",
            "Machine was in top condition.",
            "Professional team, will rent again.",
        ]
        negative_comments = [
            "Equipment had some issues during operation.",
            "Delivery was delayed by 2 days.",
            "Pricing was higher than expected.",
            "Machine needed maintenance during rental.",
            "Customer support could be more responsive.",
        ]
        
        if rating >= 4:
            comment = random.choice(positive_comments)
            sentiment = round(np.random.uniform(0.6, 1.0), 3)
        elif rating >= 3:
            comment = "Decent experience, room for improvement."
            sentiment = round(np.random.uniform(0.2, 0.6), 3)
        else:
            comment = random.choice(negative_comments)
            sentiment = round(np.random.uniform(-1.0, 0.0), 3)
        
        categories = random.sample(
            ["equipment_quality", "service", "pricing", "delivery", "communication"],
            k=random.randint(1, 3)
        )
        
        feedbacks.append({
            "id": str(uuid.uuid4()),
            "customer_id": rental["customer_id"],
            "rental_id": rental["id"],
            "rating": rating,
            "comment": comment,
            "sentiment_score": sentiment,
            "categories": json.dumps(categories),
            "created_at": rental.get("end_date", datetime.now().isoformat()),
        })
    
    return pd.DataFrame(feedbacks)


def run_pipeline():
    """Execute the full synthetic data generation pipeline."""
    print("=" * 60)
    print("  Caterpillar Dealer Platform — Synthetic Data Generator")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Stage 1: Core entities
    print("\n[1/8] Generating Dealers...")
    dealers = generate_dealers(5)
    dealers.to_csv(os.path.join(OUTPUT_DIR, "dealers.csv"), index=False)
    print(f"  ✓ {len(dealers)} dealers generated")
    
    print("[2/8] Generating Sites...")
    sites = generate_sites(dealers, 20)
    sites.to_csv(os.path.join(OUTPUT_DIR, "sites.csv"), index=False)
    print(f"  ✓ {len(sites)} sites generated")
    
    print("[3/8] Generating Customers...")
    customers = generate_customers(200)
    customers.to_csv(os.path.join(OUTPUT_DIR, "customers.csv"), index=False)
    print(f"  ✓ {len(customers)} customers generated")
    
    print("[4/8] Generating Equipment...")
    equipment = generate_equipment(dealers, 500)
    equipment.to_csv(os.path.join(OUTPUT_DIR, "equipment.csv"), index=False)
    print(f"  ✓ {len(equipment)} equipment generated")
    
    # Stage 2: Transactions
    print("[5/8] Generating Rentals...")
    rentals = generate_rentals(customers, equipment, sites, 10000)
    rentals.to_csv(os.path.join(OUTPUT_DIR, "rentals.csv"), index=False)
    print(f"  ✓ {len(rentals)} rentals generated")
    
    # Stage 3: Operational data
    print("[6/8] Generating Daily Logs (this may take a moment)...")
    daily_logs = generate_daily_logs(rentals, equipment)
    daily_logs.to_csv(os.path.join(OUTPUT_DIR, "daily_logs.csv"), index=False)
    print(f"  ✓ {len(daily_logs)} daily logs generated")
    
    print("[7/8] Generating Sensor Readings...")
    sensor_readings = generate_sensor_readings(equipment, 100)
    sensor_readings.to_csv(os.path.join(OUTPUT_DIR, "sensor_readings.csv"), index=False)
    print(f"  ✓ {len(sensor_readings)} sensor readings generated")
    
    # Stage 4: Supporting data
    print("[8/8] Generating Maintenance, Events, Feedback...")
    maintenance = generate_maintenance_records(equipment, 2000)
    maintenance.to_csv(os.path.join(OUTPUT_DIR, "maintenance_records.csv"), index=False)
    print(f"  ✓ {len(maintenance)} maintenance records generated")
    
    events = generate_events(equipment, 5000)
    events.to_csv(os.path.join(OUTPUT_DIR, "events.csv"), index=False)
    print(f"  ✓ {len(events)} events generated")
    
    feedback = generate_feedback(customers, rentals, 3000)
    feedback.to_csv(os.path.join(OUTPUT_DIR, "feedback.csv"), index=False)
    print(f"  ✓ {len(feedback)} feedback records generated")
    
    # Summary
    print("\n" + "=" * 60)
    print("  Generation Complete! Summary:")
    print("=" * 60)
    total_records = sum([
        len(dealers), len(sites), len(customers), len(equipment),
        len(rentals), len(daily_logs), len(sensor_readings),
        len(maintenance), len(events), len(feedback)
    ])
    print(f"  Total records: {total_records:,}")
    print(f"  Output directory: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)
    
    return {
        "dealers": dealers,
        "sites": sites,
        "customers": customers,
        "equipment": equipment,
        "rentals": rentals,
        "daily_logs": daily_logs,
        "sensor_readings": sensor_readings,
        "maintenance_records": maintenance,
        "events": events,
        "feedback": feedback,
    }


if __name__ == "__main__":
    data = run_pipeline()
