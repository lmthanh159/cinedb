import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaEntity {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class MovieGenreEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiPropertyOptional({ example: 'action' })
  slug?: string;
}

export class MovieCountryEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'VN' })
  isoCode!: string;

  @ApiProperty({ example: 'Vietnam' })
  name!: string;
}

export class MovieCompanyEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Studio Ghibli' })
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', nullable: true })
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 'JP', nullable: true })
  originCountry?: string | null;
}

export class MoviePersonEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Hayao Miyazaki' })
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', nullable: true })
  profileUrl?: string | null;
}

export class MovieCastEntity {
  @ApiProperty({ type: MoviePersonEntity })
  person!: MoviePersonEntity;

  @ApiPropertyOptional({ example: 'Chihiro', nullable: true })
  character?: string | null;

  @ApiProperty({ example: 0 })
  displayOrder!: number;
}

export class MovieCrewEntity {
  @ApiProperty({ type: MoviePersonEntity })
  person!: MoviePersonEntity;

  @ApiPropertyOptional({ example: 'Director', nullable: true })
  job?: string | null;

  @ApiPropertyOptional({ example: 'Directing', nullable: true })
  department?: string | null;
}

export class MovieTrailerEntity {
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

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z', nullable: true })
  publishedAt?: Date | null;
}

export class MovieImageEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'https://image.tmdb.org/t/p/original/poster.jpg' })
  filePath!: string;

  @ApiProperty({ example: 'poster' })
  type!: string;

  @ApiPropertyOptional({ example: 1080, nullable: true })
  width?: number | null;

  @ApiPropertyOptional({ example: 1600, nullable: true })
  height?: number | null;
}

export class MovieStatsEntity {
  @ApiProperty({ example: 8.5 })
  voteAverage!: number;

  @ApiProperty({ example: 1250 })
  voteCount!: number;

  @ApiProperty({ example: 8.3 })
  tmdbVoteAverage!: number;

  @ApiProperty({ example: 2500 })
  tmdbVoteCount!: number;
}

export class MovieResponseEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 12345, nullable: true })
  tmdbId?: number | null;

  @ApiProperty({ example: 'Spirited Away' })
  title!: string;

  @ApiPropertyOptional({ example: 'Sen to Chihiro no kamikakushi', nullable: true })
  originalTitle?: string | null;

  @ApiPropertyOptional({ example: 'A young girl enters the world of spirits.', nullable: true })
  overview?: string | null;

  @ApiPropertyOptional({ example: '2001-07-20T00:00:00.000Z', nullable: true })
  releaseDate?: Date | null;

  @ApiPropertyOptional({ example: 125, nullable: true })
  runtime?: number | null;

  @ApiPropertyOptional({ example: 'ja', nullable: true })
  language?: string | null;

  @ApiPropertyOptional({ example: '19000000', nullable: true })
  budget?: string | null;

  @ApiPropertyOptional({ example: '274925095', nullable: true })
  revenue?: string | null;

  @ApiPropertyOptional({ example: 'Released', nullable: true })
  status?: string | null;

  @ApiProperty({ example: 8.6 })
  voteAverage!: number;

  @ApiProperty({ example: 3200 })
  voteCount!: number;

  @ApiProperty({ example: 8.5 })
  tmdbVoteAverage!: number;

  @ApiProperty({ example: 5400 })
  tmdbVoteCount!: number;

  @ApiProperty({ example: 145.22 })
  popularity!: number;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/original/backdrop.jpg', nullable: true })
  backdropUrl?: string | null;

  @ApiProperty({ type: [MovieGenreEntity] })
  genres!: MovieGenreEntity[];
}

export class MovieDetailResponseEntity extends MovieResponseEntity {
  @ApiProperty({ type: [MovieCastEntity] })
  cast!: MovieCastEntity[];

  @ApiProperty({ type: [MovieCrewEntity] })
  crew!: MovieCrewEntity[];

  @ApiProperty({ type: [MovieTrailerEntity] })
  trailers!: MovieTrailerEntity[];

  @ApiProperty({ type: [MovieImageEntity] })
  posters!: MovieImageEntity[];

  @ApiProperty({ type: [MovieImageEntity] })
  backdrops!: MovieImageEntity[];

  @ApiProperty({ type: MovieStatsEntity })
  stats!: MovieStatsEntity;

  @ApiProperty({ type: [MovieCountryEntity] })
  countries!: MovieCountryEntity[];

  @ApiProperty({ type: [MovieCompanyEntity] })
  companies!: MovieCompanyEntity[];
}

export class MovieListResponseEntity {
  @ApiProperty({ type: [MovieResponseEntity] })
  data!: MovieResponseEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

export class MovieCreditsResponseEntity {
  @ApiProperty({ type: [MovieCastEntity] })
  cast!: MovieCastEntity[];

  @ApiProperty({ type: [MovieCrewEntity] })
  crew!: MovieCrewEntity[];
}

export class MovieImagesResponseEntity {
  @ApiProperty({ type: [MovieImageEntity] })
  posters!: MovieImageEntity[];

  @ApiProperty({ type: [MovieImageEntity] })
  backdrops!: MovieImageEntity[];
}

export class MovieVideosResponseEntity {
  @ApiProperty({ type: [MovieTrailerEntity] })
  results!: MovieTrailerEntity[];
}

export class MovieReviewsUserEntity {
  @ApiProperty({ example: '15363e81-dde7-4882-a196-cce0a6aa471c' })
  id!: string;

  @ApiProperty({ example: 'CineDB User' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl?: string | null;
}

export class MovieReviewEntity {
  @ApiProperty({ example: 8 })
  rating!: number;

  @ApiPropertyOptional({ example: 'A beautiful and emotional film.', nullable: true })
  comment?: string | null;

  @ApiProperty({ type: MovieReviewsUserEntity })
  user!: MovieReviewsUserEntity;

  @ApiProperty({ example: '2026-05-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class MovieReviewsResponseEntity {
  @ApiProperty({ type: [MovieReviewEntity] })
  data!: MovieReviewEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}
