from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.recommender.service import engine
from app.recommender.trainer import train_all

router = APIRouter(prefix="/recommend", tags=["recommendations"])


@router.get("/similar/{movie_id}")
def similar(
    movie_id: int,
    limit: int = Query(default=12, ge=1, le=50),
) -> dict[str, list[dict[str, float]]]:
    try:
        return {"results": engine.similar(movie_id, limit)}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/personalized/{user_id}")
def personalized(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=50),
) -> dict[str, list[dict[str, float]]]:
    try:
        return {"results": engine.personalized(user_id, limit)}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def _train_and_reload() -> None:
    train_all()
    engine.clear()
    engine.load(force=True)


@router.post("/retrain")
def retrain(background_tasks: BackgroundTasks) -> dict[str, str]:
    background_tasks.add_task(_train_and_reload)

    return {"status": "training_started"}
