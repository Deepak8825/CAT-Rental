"""
Core configuration for Caterpillar Dealer Asset Management Platform.
Manages environment variables, database connections, and app settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Caterpillar Dealer Asset Management Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./smart_rental.db")
    DATABASE_SYNC_URL: str = os.getenv("DATABASE_SYNC_URL", "sqlite:///./smart_rental.db")
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT Auth
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173","http://localhost:5174"]
    
    # ML Models
    MODEL_PATH: str = "./ml/models"
    
    # IoT
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    WEATHER_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
