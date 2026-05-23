import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { TvSortOrder } from '@/modules/tv-series/dto/tv-series-query.dto';

export enum TvReviewsSortBy {
  CREATED_AT = 'created_at',
  SCORE = 'score',
}

export class TvReviewsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    enum: TvReviewsSortBy,
    default: TvReviewsSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(TvReviewsSortBy)
  sort_by: TvReviewsSortBy = TvReviewsSortBy.CREATED_AT;

  @ApiPropertyOptional({
    enum: TvSortOrder,
    default: TvSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(TvSortOrder)
  sort_order: TvSortOrder = TvSortOrder.DESC;
}
