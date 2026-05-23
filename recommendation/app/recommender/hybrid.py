from app.recommender.collaborative import CollaborativeRecommender
from app.recommender.content_based import ContentBasedRecommender


class HybridRecommender:
    def __init__(
        self,
        content_based: ContentBasedRecommender,
        collaborative: CollaborativeRecommender,
        alpha: float = 0.4,
    ) -> None:
        self.cb = content_based
        self.cf = collaborative
        self.alpha = alpha

    def recommend_similar(self, movie_id: int, limit: int = 12) -> list[dict[str, float]]:
        return self.cb.get_similar(movie_id, limit)

    def recommend_personalized(
        self,
        user_id: str,
        limit: int = 20,
        user_ratings: list[dict[str, int | float]] | None = None,
        popular_fallback: list[dict[str, float]] | None = None,
    ) -> list[dict[str, float]]:
        ratings = user_ratings or []
        exclude_ids = [int(item["movie_id"]) for item in ratings]

        if not ratings:
            return (popular_fallback or [])[:limit]

        if len(ratings) < 5:
            top_rated = max(ratings, key=lambda item: float(item["score"]))
            similar = self.cb.get_similar(int(top_rated["movie_id"]), limit, exclude_ids)

            return similar or (popular_fallback or [])[:limit]

        combined: dict[int, float] = {}
        collaborative_scores = self.cf.predict(user_id, limit * 3, exclude_ids)
        for item in collaborative_scores:
            combined[int(item["movie_id"])] = (1 - self.alpha) * float(item["predicted_score"])

        top_seed_movies = sorted(ratings, key=lambda item: float(item["score"]), reverse=True)[:3]
        for seed in top_seed_movies:
            content_scores = self.cb.get_similar(int(seed["movie_id"]), limit * 3, exclude_ids)
            seed_weight = float(seed["score"]) / 10
            for item in content_scores:
                movie_id = int(item["movie_id"])
                combined[movie_id] = combined.get(movie_id, 0) + (
                    self.alpha * float(item["score"]) * seed_weight
                )

        if not combined:
            return (popular_fallback or [])[:limit]

        sorted_items = sorted(combined.items(), key=lambda item: item[1], reverse=True)

        return [
            {"movie_id": movie_id, "score": score}
            for movie_id, score in sorted_items[:limit]
        ]
