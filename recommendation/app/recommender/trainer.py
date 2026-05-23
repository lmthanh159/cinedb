from datetime import UTC, datetime
from pathlib import Path

from app.config import settings
from app.recommender.collaborative import CollaborativeRecommender
from app.recommender.content_based import ContentBasedRecommender
from app.recommender.data_loader import DataLoader


def train_all() -> dict[str, int | str]:
    models_dir = Path(settings.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    loader = DataLoader()
    movies_df = loader.load_movies()
    ratings_df = loader.load_ratings()

    content_based = ContentBasedRecommender()
    content_based.train(movies_df)
    content_based.save(models_dir / "content_based.pkl")

    collaborative = CollaborativeRecommender()
    collaborative.train(ratings_df)
    collaborative.save(models_dir / "collaborative.pkl")

    trained_at = datetime.now(UTC).isoformat()
    (models_dir / "last_trained.txt").write_text(trained_at, encoding="utf-8")

    return {
        "movies": int(len(movies_df)),
        "ratings": int(len(ratings_df)),
        "last_trained": trained_at,
    }
