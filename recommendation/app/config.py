from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    recommendation_port: int = int(os.getenv("RECOMMENDATION_PORT", "5000"))
    models_dir: str = os.getenv("RECOMMENDATION_MODELS_DIR", "models")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://cinedb:cinedb_dev_password@localhost:5432/cinedb",
    ).replace("postgresql://", "postgresql+psycopg://", 1)


settings = Settings()
