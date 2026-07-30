"""
Caterpillar Dealer Asset Management Platform — FastAPI Application.

Main entry point that wires up all routes, middleware, and startup events.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import equipment, rentals, analytics, auth, customer, ai_copilot

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 Starting Caterpillar Dealer Platform...")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Debug: {settings.DEBUG}")
    
    # Initialize database tables
    try:
        await init_db()
        logger.info("   ✓ Database initialized")
    except Exception as e:
        logger.warning(f"   ⚠ Database init skipped: {e}")
    
    yield
    
    logger.info("🛑 Shutting down Caterpillar Dealer Platform...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## AI-Powered Caterpillar Dealer Asset Management & Predictive Analytics System
    
    A comprehensive platform for managing rental assets with IoT integration,
    AI-powered predictions, and real-time analytics.
    
    ### Key Features:
    - 🏗️ Equipment & Fleet Management
    - 📊 Rental Lifecycle (Book → Checkout → Return)
    - 🤖 AI Demand Forecasting & Predictive Maintenance
    - 💰 Dynamic Pricing Engine
    - 🔧 Job-Fit Equipment Recommendations
    - 📡 IoT Sensor Data Ingestion
    - 📈 Real-time Analytics & Dashboards
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
        }
    )


# Register routes
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(customer.router, prefix=settings.API_PREFIX)
app.include_router(equipment.router, prefix=settings.API_PREFIX)
app.include_router(rentals.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(ai_copilot.router, prefix=settings.API_PREFIX)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": "Caterpillar Dealer Platform API",
    }


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "api_prefix": settings.API_PREFIX,
        "endpoints": {
            "equipment": f"{settings.API_PREFIX}/equipment",
            "rentals": f"{settings.API_PREFIX}/rentals",
            "analytics": f"{settings.API_PREFIX}/analytics",
        }
    }
