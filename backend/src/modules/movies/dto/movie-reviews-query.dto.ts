import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { SortOrder } from '@/modules/movies/dto/movie-query.dto';

export enum MovieReviewsSortBy {
  CREATED_AT = 'created_at',
  SCORE = 'score',
}

export class MovieReviewsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    enum: MovieReviewsSortBy,
    default: MovieReviewsSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(MovieReviewsSortBy)
  sort_by: MovieReviewsSortBy = MovieReviewsSortBy.CREATED_AT;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order: SortOrder = SortOrder.DESC;
}
