from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Option 1: full URL (takes priority)
    DATABASE_URL: Optional[str] = None

    # Option 2: individual pg vars (matches Soumya's schema .env.example)
    PGHOST: str = "localhost"
    PGPORT: int = 5432
    PGUSER: str = "postgres"
    PGPASSWORD: str = "password"
    PGDATABASE: str = "peoplepay360"

    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.PGUSER}:{self.PGPASSWORD}@{self.PGHOST}:{self.PGPORT}/{self.PGDATABASE}"

    class Config:
        env_file = ".env"

settings = Settings()
