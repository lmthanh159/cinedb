from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.recommender.collaborative import get_personalized_recommendations
from app.recommender.content_based import get_similar_movies

app = FastAPI(title="CineDB Recommendation Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/recommend/similar/{movie_id}")
def similar(movie_id: int) -> list[dict[str, int]]:
    return get_similar_movies(movie_id)


@app.get("/recommend/personalized/{user_id}")
def personalized(user_id: int) -> list[dict[str, int]]:
    return get_personalized_recommendations(user_id)

