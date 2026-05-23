import { ApiProperty } from '@nestjs/swagger';

import { MovieResponseEntity } from '@/modules/movies/entities/movie-response.entity';

export class RecommendedMovieEntity {
  @ApiProperty({ type: MovieResponseEntity })
  movie!: MovieResponseEntity;

  @ApiProperty({ example: 0.92 })
  score!: number;

  @ApiProperty({ example: 'hybrid' })
  source!: string;
}

export class RecommendationResponseEntity {
  @ApiProperty({ type: [RecommendedMovieEntity] })
  results!: RecommendedMovieEntity[];

  @ApiProperty({ example: false })
  fallback!: boolean;
}
