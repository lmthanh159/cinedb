CREATE INDEX IF NOT EXISTS idx_movies_title_fts
ON "Movie" USING gin (to_tsvector('simple', "title"));

CREATE INDEX IF NOT EXISTS idx_tv_series_title_fts
ON "TVSeries" USING gin (to_tsvector('simple', "title"));

CREATE INDEX IF NOT EXISTS idx_people_name_fts
ON "Person" USING gin (to_tsvector('simple', "name"));

CREATE INDEX IF NOT EXISTS idx_movies_not_deleted
ON "Movie" ("isDeleted")
WHERE "isDeleted" = false;
