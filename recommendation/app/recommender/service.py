from pathlib import Path
from threading import Lock

from app.config import settings
from app.recommender.collaborative import CollaborativeRecommender
from app.recommender.content_based import ContentBasedRecommender
from app.recommender.data_loader import DataLoader
from app.recommender.hybrid import HybridRecommender


class RecommendationEngine:
    def __init__(self) -> None:
        self._hybrid: HybridRecommender | None = None
        self._lock = Lock()
        self.loader = DataLoader()

    @property
    def models_dir(self) -> Path:
        return Path(settings.models_dir)

    def models_exist(self) -> bool:
        return (self.models_dir / "content_based.pkl").exists() and (
            self.models_dir / "collaborative.pkl"
        ).exists()

    def last_trained(self) -> str | None:
        path = self.models_dir / "last_trained.txt"
        if not path.exists():
            return None

        return path.read_text(encoding="utf-8").strip() or None

    def load(self, force: bool = False) -> HybridRecommender:
        with self._lock:
            if self._hybrid is not None and not force:
                return self._hybrid

            if not self.models_exist():
                raise RuntimeError("Recommendation models are not trained yet.")

            content_based = ContentBasedRecommender.load(self.models_dir / "content_based.pkl")
            collaborative = CollaborativeRecommender.load(self.models_dir / "collaborative.pkl")
            self._hybrid = HybridRecommender(content_based, collaborative)

            return self._hybrid

    def clear(self) -> None:
        with self._lock:
            self._hybrid = None

    def similar(self, movie_id: int, limit: int) -> list[dict[str, float]]:
        return self.load().recommend_similar(movie_id, limit)

    def personalized(self, user_id: str, limit: int) -> list[dict[str, float]]:
        ratings = self.loader.load_user_ratings(user_id)
        popular = self.loader.load_popular_movies(limit)

        return self.load().recommend_personalized(user_id, limit, ratings, popular)


engine = RecommendationEngine()
