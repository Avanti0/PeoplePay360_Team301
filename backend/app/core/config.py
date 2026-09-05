from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # email_service.py/pdf_service.py read SMTP_*/PDF_DIR straight from the
    # environment via os.getenv() rather than through this class — ignore
    # them here instead of duplicating them as unused fields.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

settings = Settings()
