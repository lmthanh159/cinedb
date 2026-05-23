import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class RatingsTimeSeriesPointEntity {
  @ApiProperty({ example: '2026-05-23' })
  date!: string;

  @ApiProperty({ example: 24 })
  totalRatings!: number;

  @ApiPropertyOptional({ example: 7.82, nullable: true })
  averageScore!: number | null;
}

export class RatingsTimeSeriesResponseEntity {
  @ApiProperty({ type: [RatingsTimeSeriesPointEntity] })
  data!: RatingsTimeSeriesPointEntity[];
}

export class TopMovieChartEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Spirited Away' })
  title!: string;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl!: string | null;

  @ApiPropertyOptional({ example: '2001-07-20T00:00:00.000Z', nullable: true })
  releaseDate!: Date | null;

  @ApiProperty({ example: 8.6 })
  voteAverage!: number;

  @ApiProperty({ example: 1234 })
  voteCount!: number;

  @ApiProperty({ example: 42 })
  totalRatings!: number;

  @ApiPropertyOptional({ example: 8.12, nullable: true })
  averageScore!: number | null;
}

export class TopMoviesChartResponseEntity {
  @ApiProperty({ type: [TopMovieChartEntity] })
  data!: TopMovieChartEntity[];
}

export class GenreDistributionPointEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiProperty({ example: 'action' })
  slug!: string;

  @ApiProperty({ example: 42 })
  movieCount!: number;

  @ApiProperty({ example: 12 })
  tvCount!: number;

  @ApiProperty({ example: 54 })
  totalCount!: number;
}

export class GenreDistributionResponseEntity {
  @ApiProperty({ type: [GenreDistributionPointEntity] })
  data!: GenreDistributionPointEntity[];
}
