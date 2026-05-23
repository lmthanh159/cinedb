from fastapi import APIRouter

from app.database import check_database
from app.recommender.service import engine

router = APIRouter()


@router.get("/health")
def health() -> dict[str, bool | str | None]:
    return {
        "status": "ok",
        "database": check_database(),
        "models_loaded": engine.models_exist(),
        "last_trained": engine.last_trained(),
    }
