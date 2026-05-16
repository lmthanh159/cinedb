import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrendingPaginationMetaEntity {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class TrendingGenreEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiPropertyOptional({ example: 'action' })
  slug?: string;
}

export class TrendingItemEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Spirited Away' })
  title!: string;

  @ApiProperty({ enum: ['movie', 'tv'], example: 'movie' })
  mediaType!: 'movie' | 'tv';

  @ApiPropertyOptional({ example: '2001-07-20T00:00:00.000Z', nullable: true })
  releaseDate?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  firstAirDate?: Date | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/original/backdrop.jpg', nullable: true })
  backdropUrl?: string | null;

  @ApiProperty({ example: 8.6 })
  voteAverage!: number;

  @ApiProperty({ example: 3200 })
  voteCount!: number;

  @ApiProperty({ example: 145.22 })
  popularity!: number;

  @ApiProperty({ example: 32 })
  recentRatingsCount!: number;

  @ApiProperty({ example: 1034.21 })
  trendingScore!: number;

  @ApiProperty({ type: [TrendingGenreEntity] })
  genres!: TrendingGenreEntity[];
}

export class TrendingListResponseEntity {
  @ApiProperty({ type: [TrendingItemEntity] })
  data!: TrendingItemEntity[];

  @ApiProperty({ type: TrendingPaginationMetaEntity })
  meta!: TrendingPaginationMetaEntity;
}
