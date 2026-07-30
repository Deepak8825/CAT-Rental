"""
Authentication API routes — Login, Register, Token Validation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.models import Customer, AdminUser, CustomerProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Schemas ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)
    company: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    name: str


# ─── Customer Registration ───────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register_customer(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new customer account."""
    # Check if email already exists
    existing = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Create customer
    customer = Customer(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        phone=data.phone,
        company=data.company,
        is_active=True,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)

    # Create empty profile
    profile = CustomerProfile(customer_id=customer.id)
    db.add(profile)
    await db.commit()

    # Generate token
    token = create_access_token(
        user_id=str(customer.id),
        role="customer",
        email=customer.email,
    )

    return TokenResponse(
        access_token=token,
        role="customer",
        user_id=str(customer.id),
        name=customer.name,
    )


# ─── Customer Login ──────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login for customers."""
    result = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    customer = result.scalar_one_or_none()

    if not customer or not customer.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(
        user_id=str(customer.id),
        role="customer",
        email=customer.email,
    )

    return TokenResponse(
        access_token=token,
        role="customer",
        user_id=str(customer.id),
        name=customer.name,
    )


# ─── Admin Login ─────────────────────────────────────────

@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login for admin/fleet operators."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == data.email)
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )

    if not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )

    token = create_access_token(
        user_id=str(admin.id),
        role="admin",
        email=admin.email,
    )

    return TokenResponse(
        access_token=token,
        role="admin",
        user_id=str(admin.id),
        name=admin.name,
    )


# ─── Current User ────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


# ─── Seed Admin (dev helper) ─────────────────────────────

@router.post("/seed-admin")
async def seed_admin(db: AsyncSession = Depends(get_db)):
    """Create default admin and customer accounts (dev helper)."""
    # Seed Admin: admin01@gmail.com / passadmin123
    admin_result = await db.execute(
        select(AdminUser).where(AdminUser.email == "admin01@gmail.com")
    )
    admin = admin_result.scalar_one_or_none()
    if not admin:
        admin = AdminUser(
            name="Fleet Administrator",
            email="admin01@gmail.com",
            password_hash=hash_password("passadmin123"),
            role="admin",
        )
        db.add(admin)

    # Seed Customer: user01@gmail.com / pass123
    cust_result = await db.execute(
        select(Customer).where(Customer.email == "user01@gmail.com")
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            name="User 01",
            email="user01@gmail.com",
            password_hash=hash_password("pass123"),
            company="Caterpillar Rentals Inc",
            phone="+91 98765 43210",
            is_active=True,
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)

        profile = CustomerProfile(
            customer_id=customer.id,
            business_type="construction",
            gst_number="22AAAAA0000A1Z5",
            billing_address="123 Industrial Area, Sector 62, Noida",
            profile_completed=True,
        )
        db.add(profile)

    await db.commit()
    return {
        "message": "Default accounts ready",
        "admin": "admin01@gmail.com / passadmin123",
        "user": "user01@gmail.com / pass123"
    }
