from sqlalchemy import text

import pandas as pd

from app.database import engine


class DataLoader:
    def load_movies(self) -> pd.DataFrame:
        query = text(
            """
            WITH directors AS (
              SELECT DISTINCT ON ("movieId")
                "movieId",
                "personId" AS director_id
              FROM "MovieCrew"
              WHERE job ILIKE 'Director' OR department ILIKE 'Directing'
              ORDER BY "movieId", id
            ),
            genres AS (
              SELECT
                mg."B" AS movie_id,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT mg."A"), NULL) AS genre_ids
              FROM "_MovieGenres" mg
              GROUP BY mg."B"
            ),
            cast_members AS (
              SELECT
                "movieId" AS movie_id,
                ARRAY_REMOVE(ARRAY_AGG("personId" ORDER BY "displayOrder"), NULL) AS cast_ids
              FROM "MovieCast"
              WHERE "displayOrder" < 5
              GROUP BY "movieId"
            )
            SELECT
              m.id,
              m.title,
              COALESCE(g.genre_ids, ARRAY[]::INTEGER[]) AS genre_ids,
              d.director_id,
              COALESCE(c.cast_ids, ARRAY[]::INTEGER[]) AS cast_ids,
              COALESCE(m.popularity, 0) AS popularity,
              COALESCE(NULLIF(m."voteAverage", 0), m."tmdbVoteAverage", 0) AS vote_average,
              COALESCE(m."posterUrl", '') AS poster_url
            FROM "Movie" m
            LEFT JOIN directors d ON d."movieId" = m.id
            LEFT JOIN genres g ON g.movie_id = m.id
            LEFT JOIN cast_members c ON c.movie_id = m.id
            WHERE m."isDeleted" = false
            ORDER BY m.id
            """
        )

        with engine.connect() as connection:
            return pd.read_sql(query, connection)

    def load_ratings(self) -> pd.DataFrame:
        query = text(
            """
            SELECT
              "userId"::TEXT AS user_id,
              "movieId" AS movie_id,
              score::FLOAT AS score
            FROM "Rating"
            WHERE "movieId" IS NOT NULL
            """
        )

        with engine.connect() as connection:
            return pd.read_sql(query, connection)

    def load_user_ratings(self, user_id: str) -> list[dict[str, int | float]]:
        query = text(
            """
            SELECT "movieId" AS movie_id, score::FLOAT AS score
            FROM "Rating"
            WHERE "userId"::TEXT = :user_id AND "movieId" IS NOT NULL
            ORDER BY score DESC, "updatedAt" DESC
            """
        )

        with engine.connect() as connection:
            rows = connection.execute(query, {"user_id": user_id}).mappings().all()

        return [
            {"movie_id": int(row["movie_id"]), "score": float(row["score"])}
            for row in rows
        ]

    def load_popular_movies(self, limit: int = 20) -> list[dict[str, float]]:
        query = text(
            """
            SELECT id AS movie_id, COALESCE(popularity, 0) AS score
            FROM "Movie"
            WHERE "isDeleted" = false
            ORDER BY popularity DESC, "tmdbVoteAverage" DESC
            LIMIT :limit
            """
        )

        with engine.connect() as connection:
            rows = connection.execute(query, {"limit": limit}).mappings().all()

        return [
            {"movie_id": int(row["movie_id"]), "score": float(row["score"])}
            for row in rows
        ]
