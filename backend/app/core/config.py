import secrets
from typing import List, Union
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Internal Company App"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change_this_to_a_secure_random_string_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    # Database
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # First Super Admin (Seeding)
    FIRST_SUPER_ADMIN_EMAIL: str = "admin@example.com"
    FIRST_SUPER_ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"

settings = Settings()
