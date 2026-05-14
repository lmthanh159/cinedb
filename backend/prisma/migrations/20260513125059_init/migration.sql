-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LOCKED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('UNKNOWN', 'FEMALE', 'MALE', 'NON_BINARY');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT,
    "displayName" VARCHAR(100) NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "oauthProvider" VARCHAR(50),
    "oauthId" VARCHAR(255),
    "language" VARCHAR(10) NOT NULL DEFAULT 'vi',
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "title" VARCHAR(500) NOT NULL,
    "originalTitle" VARCHAR(500),
    "overview" TEXT,
    "releaseDate" TIMESTAMP(3),
    "runtime" INTEGER,
    "language" VARCHAR(10),
    "budget" BIGINT DEFAULT 0,
    "revenue" BIGINT DEFAULT 0,
    "status" VARCHAR(50),
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "tmdbVoteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tmdbVoteCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isAdminEdited" BOOLEAN NOT NULL DEFAULT false,
    "adminEditedFields" JSONB,
    "tmdbLastSynced" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVSeries" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "title" VARCHAR(500) NOT NULL,
    "originalTitle" VARCHAR(500),
    "overview" TEXT,
    "firstAirDate" TIMESTAMP(3),
    "lastAirDate" TIMESTAMP(3),
    "status" VARCHAR(50),
    "numberOfSeasons" INTEGER NOT NULL DEFAULT 0,
    "numberOfEpisodes" INTEGER NOT NULL DEFAULT 0,
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "tmdbVoteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tmdbVoteCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isAdminEdited" BOOLEAN NOT NULL DEFAULT false,
    "adminEditedFields" JSONB,
    "tmdbLastSynced" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "tmdbId" INTEGER,
    "seasonNumber" INTEGER NOT NULL,
    "name" VARCHAR(255),
    "overview" TEXT,
    "airDate" TIMESTAMP(3),
    "posterUrl" TEXT,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "tmdbId" INTEGER,
    "episodeNumber" INTEGER NOT NULL,
    "name" VARCHAR(255),
    "overview" TEXT,
    "airDate" TIMESTAMP(3),
    "runtime" INTEGER,
    "stillUrl" TEXT,
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "name" VARCHAR(300) NOT NULL,
    "originalName" VARCHAR(300),
    "biography" TEXT,
    "birthday" TIMESTAMP(3),
    "deathday" TIMESTAMP(3),
    "placeOfBirth" VARCHAR(255),
    "gender" "GenderType" NOT NULL DEFAULT 'UNKNOWN',
    "profileUrl" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "knownForDepartment" VARCHAR(100),
    "tmdbLastSynced" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "content" VARCHAR(5000) NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteItem" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trailer" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "name" VARCHAR(255),
    "key" VARCHAR(50) NOT NULL,
    "site" VARCHAR(50) NOT NULL DEFAULT 'YouTube',
    "type" VARCHAR(50),
    "official" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER,
    "seriesId" INTEGER,
    "personId" INTEGER,
    "filePath" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "isoCode" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCompany" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "logoUrl" TEXT,
    "originCountry" VARCHAR(10),

    CONSTRAINT "ProductionCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieCast" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "character" VARCHAR(255),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MovieCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieCrew" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "job" VARCHAR(100),
    "department" VARCHAR(100),

    CONSTRAINT "MovieCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesCast" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "character" VARCHAR(255),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeriesCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesCrew" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "job" VARCHAR(100),
    "department" VARCHAR(100),

    CONSTRAINT "SeriesCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" UUID NOT NULL,
    "commentId" INTEGER,
    "targetUserId" UUID,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entityType" VARCHAR(50),
    "entityId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TmdbSyncLog" (
    "id" SERIAL NOT NULL,
    "syncType" VARCHAR(50) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalUpdated" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TmdbSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieCompanies" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MovieCompanies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MovieGenres" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MovieGenres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TVSeriesGenres" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TVSeriesGenres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MovieCountries" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MovieCountries_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TVSeriesCountries" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TVSeriesCountries_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TVSeriesCompanies" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TVSeriesCompanies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_oauthProvider_oauthId_key" ON "User"("oauthProvider", "oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_releaseDate_idx" ON "Movie"("releaseDate" DESC);

-- CreateIndex
CREATE INDEX "Movie_popularity_idx" ON "Movie"("popularity" DESC);

-- CreateIndex
CREATE INDEX "Movie_voteAverage_idx" ON "Movie"("voteAverage" DESC);

-- CreateIndex
CREATE INDEX "Movie_isDeleted_idx" ON "Movie"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "TVSeries_tmdbId_key" ON "TVSeries"("tmdbId");

-- CreateIndex
CREATE INDEX "TVSeries_firstAirDate_idx" ON "TVSeries"("firstAirDate" DESC);

-- CreateIndex
CREATE INDEX "TVSeries_popularity_idx" ON "TVSeries"("popularity" DESC);

-- CreateIndex
CREATE INDEX "TVSeries_voteAverage_idx" ON "TVSeries"("voteAverage" DESC);

-- CreateIndex
CREATE INDEX "TVSeries_isDeleted_idx" ON "TVSeries"("isDeleted");

-- CreateIndex
CREATE INDEX "Season_tmdbId_idx" ON "Season"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_seriesId_seasonNumber_key" ON "Season"("seriesId", "seasonNumber");

-- CreateIndex
CREATE INDEX "Episode_tmdbId_idx" ON "Episode"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "Person"("tmdbId");

-- CreateIndex
CREATE INDEX "Person_popularity_idx" ON "Person"("popularity" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_tmdbId_key" ON "Genre"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE INDEX "Rating_movieId_idx" ON "Rating"("movieId");

-- CreateIndex
CREATE INDEX "Rating_seriesId_idx" ON "Rating"("seriesId");

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_movieId_key" ON "Rating"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_seriesId_key" ON "Rating"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "Comment_movieId_createdAt_idx" ON "Comment"("movieId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_seriesId_createdAt_idx" ON "Comment"("seriesId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_movieId_key" ON "WatchlistItem"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_seriesId_key" ON "WatchlistItem"("userId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteItem_userId_movieId_key" ON "FavoriteItem"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteItem_userId_seriesId_key" ON "FavoriteItem"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "Trailer_movieId_idx" ON "Trailer"("movieId");

-- CreateIndex
CREATE INDEX "Trailer_seriesId_idx" ON "Trailer"("seriesId");

-- CreateIndex
CREATE INDEX "Image_movieId_idx" ON "Image"("movieId");

-- CreateIndex
CREATE INDEX "Image_seriesId_idx" ON "Image"("seriesId");

-- CreateIndex
CREATE INDEX "Image_personId_idx" ON "Image"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionCompany_tmdbId_key" ON "ProductionCompany"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCast_movieId_personId_character_key" ON "MovieCast"("movieId", "personId", "character");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCrew_movieId_personId_job_key" ON "MovieCrew"("movieId", "personId", "job");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesCast_seriesId_personId_character_key" ON "SeriesCast"("seriesId", "personId", "character");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesCrew_seriesId_personId_job_key" ON "SeriesCrew"("seriesId", "personId", "job");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_commentId_key" ON "Report"("reporterId", "commentId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "_MovieCompanies_B_index" ON "_MovieCompanies"("B");

-- CreateIndex
CREATE INDEX "_MovieGenres_B_index" ON "_MovieGenres"("B");

-- CreateIndex
CREATE INDEX "_TVSeriesGenres_B_index" ON "_TVSeriesGenres"("B");

-- CreateIndex
CREATE INDEX "_MovieCountries_B_index" ON "_MovieCountries"("B");

-- CreateIndex
CREATE INDEX "_TVSeriesCountries_B_index" ON "_TVSeriesCountries"("B");

-- CreateIndex
CREATE INDEX "_TVSeriesCompanies_B_index" ON "_TVSeriesCompanies"("B");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trailer" ADD CONSTRAINT "Trailer_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trailer" ADD CONSTRAINT "Trailer_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCast" ADD CONSTRAINT "MovieCast_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCast" ADD CONSTRAINT "MovieCast_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCrew" ADD CONSTRAINT "MovieCrew_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCrew" ADD CONSTRAINT "MovieCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesCast" ADD CONSTRAINT "SeriesCast_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesCast" ADD CONSTRAINT "SeriesCast_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesCrew" ADD CONSTRAINT "SeriesCrew_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesCrew" ADD CONSTRAINT "SeriesCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCompanies" ADD CONSTRAINT "_MovieCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCompanies" ADD CONSTRAINT "_MovieCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductionCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieGenres" ADD CONSTRAINT "_MovieGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieGenres" ADD CONSTRAINT "_MovieGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesGenres" ADD CONSTRAINT "_TVSeriesGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesGenres" ADD CONSTRAINT "_TVSeriesGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCountries" ADD CONSTRAINT "_MovieCountries_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCountries" ADD CONSTRAINT "_MovieCountries_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesCountries" ADD CONSTRAINT "_TVSeriesCountries_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesCountries" ADD CONSTRAINT "_TVSeriesCountries_B_fkey" FOREIGN KEY ("B") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesCompanies" ADD CONSTRAINT "_TVSeriesCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "ProductionCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TVSeriesCompanies" ADD CONSTRAINT "_TVSeriesCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "TVSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
