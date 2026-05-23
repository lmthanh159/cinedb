from pathlib import Path

from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD

import numpy as np
import pandas as pd

from app.utils import dump_pickle, load_pickle


class CollaborativeRecommender:
    def __init__(self) -> None:
        self.model: TruncatedSVD | None = None
        self.user_factors: np.ndarray | None = None
        self.item_factors: np.ndarray | None = None
        self.user_indices: dict[str, int] = {}
        self.movie_indices: dict[int, int] = {}
        self.movie_ids: list[int] = []
        self.user_rated_movies: dict[str, set[int]] = {}

    def train(self, ratings_df: pd.DataFrame) -> None:
        if ratings_df.empty:
            return

        ratings = ratings_df.copy()
        ratings["user_id"] = ratings["user_id"].astype(str)
        users = sorted(ratings["user_id"].unique().tolist())
        movies = sorted(int(movie_id) for movie_id in ratings["movie_id"].unique().tolist())
        self.user_indices = {user_id: index for index, user_id in enumerate(users)}
        self.movie_indices = {movie_id: index for index, movie_id in enumerate(movies)}
        self.movie_ids = movies
        self.user_rated_movies = {
            user_id: set(group["movie_id"].astype(int).tolist())
            for user_id, group in ratings.groupby("user_id")
        }

        row_indices = ratings["user_id"].map(self.user_indices).to_numpy()
        column_indices = ratings["movie_id"].astype(int).map(self.movie_indices).to_numpy()
        values = ratings["score"].astype(float).to_numpy()
        matrix = csr_matrix((values, (row_indices, column_indices)), shape=(len(users), len(movies)))

        max_components = min(matrix.shape) - 1
        if max_components < 1:
            return

        components = min(50, max_components)
        self.model = TruncatedSVD(n_components=components, random_state=42)
        self.user_factors = self.model.fit_transform(matrix)
        self.item_factors = self.model.components_.T

    def predict(
        self,
        user_id: str,
        limit: int = 20,
        exclude_ids: list[int] | None = None,
    ) -> list[dict[str, float]]:
        if self.user_factors is None or self.item_factors is None:
            return []

        normalized_user_id = str(user_id)
        if normalized_user_id not in self.user_indices:
            return []

        user_index = self.user_indices[normalized_user_id]
        scores = self.user_factors[user_index] @ self.item_factors.T
        excluded = set(exclude_ids or []) | self.user_rated_movies.get(normalized_user_id, set())
        candidates = [
            (movie_id, float(scores[index]))
            for movie_id, index in self.movie_indices.items()
            if movie_id not in excluded
        ]
        candidates.sort(key=lambda item: item[1], reverse=True)

        return [
            {"movie_id": movie_id, "predicted_score": score}
            for movie_id, score in candidates[:limit]
        ]

    def save(self, path: str | Path) -> None:
        dump_pickle(self, path)

    @classmethod
    def load(cls, path: str | Path) -> "CollaborativeRecommender":
        return load_pickle(path)


def get_personalized_recommendations(user_id: int) -> list[dict[str, float]]:
    model_path = Path("models/collaborative.pkl")
    if not model_path.exists():
        return []

    return CollaborativeRecommender.load(model_path).predict(str(user_id))
