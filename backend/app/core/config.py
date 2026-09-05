from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/peoplepay360"
    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"

settings = Settings()
