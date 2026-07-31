"""
Master Seeder Script for Caterpillar Dealer Platform.
Re-creates all database tables and populates with synchronized synthetic data.
"""
import os
import sys
import uuid
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.database import Base
from app.core.auth import hash_password
from app.models.models import (
    Dealer, Customer, Equipment, Site, Rental, DailyLog,
    SensorReading, MaintenanceRecord, Event, Feedback, AdminUser, CustomerProfile
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

from generate_enterprise_db import generate_enterprise_database

def seed_all():
    generate_enterprise_database()

if __name__ == "__main__":
    seed_all()
