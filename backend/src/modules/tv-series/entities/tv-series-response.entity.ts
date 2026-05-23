import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TvPaginationMetaEntity {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 40 })
  total!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}

export class TvGenreEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Drama' })
  name!: string;

  @ApiPropertyOptional({ example: 'drama' })
  slug?: string;
}

export class TvPersonEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Actor Name' })
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', nullable: true })
  profileUrl?: string | null;
}

export class TvCastEntity {
  @ApiProperty({ type: TvPersonEntity })
  person!: TvPersonEntity;

  @ApiPropertyOptional({ example: 'Main Character', nullable: true })
  character?: string | null;

  @ApiProperty({ example: 0 })
  displayOrder!: number;
}

export class TvCrewEntity {
  @ApiProperty({ type: TvPersonEntity })
  person!: TvPersonEntity;

  @ApiPropertyOptional({ example: 'Director', nullable: true })
  job?: string | null;

  @ApiPropertyOptional({ example: 'Directing', nullable: true })
  department?: string | null;
}

export class TvTrailerEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 'Official Trailer', nullable: true })
  name?: string | null;

  @ApiProperty({ example: 'abcd1234' })
  key!: string;

  @ApiProperty({ example: 'YouTube' })
  site!: string;

  @ApiPropertyOptional({ example: 'Trailer', nullable: true })
  type?: string | null;

  @ApiProperty({ example: true })
  official!: boolean;

  @ApiPropertyOptional({ example: '2026-05-14T00:00:00.000Z', nullable: true })
  publishedAt?: Date | null;
}

export class TvSeasonOverviewEntity {
  @ApiProperty({ example: 1 })
  seasonNumber!: number;

  @ApiPropertyOptional({ example: 'Season 1', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ example: 10 })
  episodeCount?: number;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/season.jpg', nullable: true })
  posterUrl?: string | null;
}

export class TvImageEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'https://image.tmdb.org/t/p/original/backdrop.jpg' })
  filePath!: string;

  @ApiProperty({ example: 'backdrop' })
  type!: string;

  @ApiPropertyOptional({ example: 1920, nullable: true })
  width?: number | null;

  @ApiPropertyOptional({ example: 1080, nullable: true })
  height?: number | null;
}

export class TvCountryEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'US' })
  isoCode!: string;

  @ApiProperty({ example: 'United States' })
  name!: string;
}

export class TvCompanyEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'HBO' })
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', nullable: true })
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 'US', nullable: true })
  originCountry?: string | null;
}

export class TvStatsEntity {
  @ApiProperty({ example: 8.7 })
  voteAverage!: number;

  @ApiProperty({ example: 500 })
  voteCount!: number;

  @ApiProperty({ example: 8.8 })
  tmdbVoteAverage!: number;

  @ApiProperty({ example: 1200 })
  tmdbVoteCount!: number;
}

export class TvSeriesResponseEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 12345, nullable: true })
  tmdbId?: number | null;

  @ApiProperty({ example: 'Sample Series' })
  title!: string;

  @ApiPropertyOptional({ example: 'Original Series Title', nullable: true })
  originalTitle?: string | null;

  @ApiPropertyOptional({ example: 'Overview of the series.', nullable: true })
  overview?: string | null;

  @ApiPropertyOptional({ example: '2026-05-14T00:00:00.000Z', nullable: true })
  firstAirDate?: Date | null;

  @ApiPropertyOptional({ example: '2026-06-14T00:00:00.000Z', nullable: true })
  lastAirDate?: Date | null;

  @ApiPropertyOptional({ example: 'Returning Series', nullable: true })
  status?: string | null;

  @ApiProperty({ example: 2 })
  numberOfSeasons!: number;

  @ApiProperty({ example: 20 })
  numberOfEpisodes!: number;

  @ApiProperty({ example: 8.7 })
  voteAverage!: number;

  @ApiProperty({ example: 500 })
  voteCount!: number;

  @ApiProperty({ example: 8.8 })
  tmdbVoteAverage!: number;

  @ApiProperty({ example: 1200 })
  tmdbVoteCount!: number;

  @ApiProperty({ example: 220.5 })
  popularity!: number;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/original/backdrop.jpg', nullable: true })
  backdropUrl?: string | null;

  @ApiProperty({ type: [TvGenreEntity] })
  genres!: TvGenreEntity[];
}

export class TvSeriesDetailResponseEntity extends TvSeriesResponseEntity {
  @ApiProperty({ type: [TvSeasonOverviewEntity] })
  seasons!: TvSeasonOverviewEntity[];

  @ApiProperty({ type: [TvCastEntity] })
  cast!: TvCastEntity[];

  @ApiProperty({ type: [TvCrewEntity] })
  crew!: TvCrewEntity[];

  @ApiProperty({ type: [TvTrailerEntity] })
  trailers!: TvTrailerEntity[];

  @ApiProperty({ type: [TvImageEntity] })
  images!: TvImageEntity[];

  @ApiProperty({ type: TvStatsEntity })
  stats!: TvStatsEntity;

  @ApiProperty({ type: [TvCountryEntity] })
  countries!: TvCountryEntity[];

  @ApiProperty({ type: [TvCompanyEntity] })
  companies!: TvCompanyEntity[];
}

export class TvSeriesListResponseEntity {
  @ApiProperty({ type: [TvSeriesResponseEntity] })
  data!: TvSeriesResponseEntity[];

  @ApiProperty({ type: TvPaginationMetaEntity })
  meta!: TvPaginationMetaEntity;
}

export class TvCreditsResponseEntity {
  @ApiProperty({ type: [TvCastEntity] })
  cast!: TvCastEntity[];

  @ApiProperty({ type: [TvCrewEntity] })
  crew!: TvCrewEntity[];
}

export class TvVideosResponseEntity {
  @ApiProperty({ type: [TvTrailerEntity] })
  results!: TvTrailerEntity[];
}

export class TvReviewsUserEntity {
  @ApiProperty({ example: '15363e81-dde7-4882-a196-cce0a6aa471c' })
  id!: string;

  @ApiProperty({ example: 'CineDB User' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl?: string | null;
}

export class TvReviewEntity {
  @ApiProperty({ example: 8 })
  rating!: number;

  @ApiPropertyOptional({ example: 'A strong season with excellent pacing.', nullable: true })
  comment?: string | null;

  @ApiProperty({ type: TvReviewsUserEntity })
  user!: TvReviewsUserEntity;

  @ApiProperty({ example: '2026-05-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class TvReviewsResponseEntity {
  @ApiProperty({ type: [TvReviewEntity] })
  data!: TvReviewEntity[];

  @ApiProperty({ type: TvPaginationMetaEntity })
  meta!: TvPaginationMetaEntity;
}

export class EpisodeResponseEntity {
  @ApiProperty({ example: 1 })
  episodeNumber!: number;

  @ApiPropertyOptional({ example: 'Pilot', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ example: 'The first episode.', nullable: true })
  overview?: string | null;

  @ApiPropertyOptional({ example: '2026-05-14T00:00:00.000Z', nullable: true })
  airDate?: Date | null;

  @ApiPropertyOptional({ example: 45, nullable: true })
  runtime?: number | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/still.jpg', nullable: true })
  stillUrl?: string | null;

  @ApiProperty({ example: 8.5 })
  voteAverage!: number;

  @ApiProperty({ example: 100 })
  voteCount!: number;
}

export class SeasonDetailResponseEntity {
  @ApiProperty({ example: 1 })
  seasonNumber!: number;

  @ApiPropertyOptional({ example: 'Season 1', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ example: 'Season overview.', nullable: true })
  overview?: string | null;

  @ApiPropertyOptional({ example: '2026-05-14T00:00:00.000Z', nullable: true })
  airDate?: Date | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/season.jpg', nullable: true })
  posterUrl?: string | null;

  @ApiProperty({ example: 10 })
  episodeCount!: number;

  @ApiProperty({ type: [EpisodeResponseEntity] })
  episodes!: EpisodeResponseEntity[];
}
