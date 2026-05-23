from pathlib import Path

from scipy import sparse
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer, MinMaxScaler

import pandas as pd

from app.utils import dump_pickle, load_pickle


class ContentBasedRecommender:
    def __init__(self) -> None:
        self.similarity_matrix = None
        self.movie_indices: dict[int, int] = {}
        self.movie_ids: list[int] = []

    def train(self, movies_df: pd.DataFrame) -> None:
        if movies_df.empty:
            self.similarity_matrix = sparse.csr_matrix((0, 0))
            self.movie_indices = {}
            self.movie_ids = []
            return

        movies = movies_df.copy()
        movies["genre_ids"] = movies["genre_ids"].apply(self._normalize_list)
        movies["cast_ids"] = movies["cast_ids"].apply(self._normalize_list)
        movies["director_id"] = movies["director_id"].fillna(0).astype(int)

        genre_features = MultiLabelBinarizer(sparse_output=True).fit_transform(movies["genre_ids"])
        cast_features = MultiLabelBinarizer(sparse_output=True).fit_transform(movies["cast_ids"])
        director_features = MultiLabelBinarizer(sparse_output=True).fit_transform(
            movies["director_id"].apply(lambda value: [] if value == 0 else [value])
        )
        numeric_features = MinMaxScaler().fit_transform(
            movies[["popularity", "vote_average"]].fillna(0).astype(float)
        )

        feature_matrix = sparse.hstack(
            [
                genre_features * 3.0,
                director_features * 2.0,
                cast_features,
                sparse.csr_matrix(numeric_features),
            ],
            format="csr",
        )

        self.similarity_matrix = cosine_similarity(feature_matrix, dense_output=False)
        self.movie_ids = [int(movie_id) for movie_id in movies["id"].tolist()]
        self.movie_indices = {
            movie_id: index for index, movie_id in enumerate(self.movie_ids)
        }

    def get_similar(
        self,
        movie_id: int,
        limit: int = 12,
        exclude_ids: list[int] | None = None,
    ) -> list[dict[str, float]]:
        if self.similarity_matrix is None or movie_id not in self.movie_indices:
            return []

        excluded = set(exclude_ids or [])
        excluded.add(movie_id)
        index = self.movie_indices[movie_id]
        row = self.similarity_matrix.getrow(index).toarray().ravel()
        candidates = [
            (self.movie_ids[item_index], float(score))
            for item_index, score in enumerate(row)
            if self.movie_ids[item_index] not in excluded and score > 0
        ]
        candidates.sort(key=lambda item: item[1], reverse=True)

        return [
            {"movie_id": candidate_id, "score": score}
            for candidate_id, score in candidates[:limit]
        ]

    def save(self, path: str | Path) -> None:
        dump_pickle(self, path)

    @classmethod
    def load(cls, path: str | Path) -> "ContentBasedRecommender":
        return load_pickle(path)

    @staticmethod
    def _normalize_list(value: object) -> list[int]:
        if value is None:
            return []
        if isinstance(value, list):
            return [int(item) for item in value if item is not None]
        if isinstance(value, tuple):
            return [int(item) for item in value if item is not None]

        return []


def get_similar_movies(movie_id: int) -> list[dict[str, float]]:
    model_path = Path("models/content_based.pkl")
    if not model_path.exists():
        return []

    return ContentBasedRecommender.load(model_path).get_similar(movie_id)
