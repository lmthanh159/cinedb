import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum MovieCategory {
  POPULAR = 'popular',
  NOW_PLAYING = 'now_playing',
  UPCOMING = 'upcoming',
  TOP_RATED = 'top_rated',
}

export enum MovieSortBy {
  POPULARITY = 'popularity',
  VOTE_AVERAGE = 'vote_average',
  RELEASE_DATE = 'release_date',
  TITLE = 'title',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class MovieQueryDto {
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
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({
    enum: MovieCategory,
  })
  @IsOptional()
  @IsEnum(MovieCategory)
  category?: MovieCategory;

  @ApiPropertyOptional({
    enum: MovieSortBy,
  })
  @IsOptional()
  @IsEnum(MovieSortBy)
  sort_by?: MovieSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order: SortOrder = SortOrder.DESC;
}
