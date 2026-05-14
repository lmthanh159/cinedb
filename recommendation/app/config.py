from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    recommendation_port: int = int(os.getenv("RECOMMENDATION_PORT", "5000"))
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://cinedb:cinedb_dev_password@localhost:5432/cinedb",
    )


settings = Settings()

