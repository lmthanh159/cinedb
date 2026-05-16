import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum TvSeriesCategory {
  POPULAR = 'popular',
  NOW_PLAYING = 'now_playing',
  UPCOMING = 'upcoming',
  TOP_RATED = 'top_rated',
}

export enum TvSeriesSortBy {
  POPULARITY = 'popularity',
  VOTE_AVERAGE = 'vote_average',
  FIRST_AIR_DATE = 'first_air_date',
  TITLE = 'title',
}

export enum TvSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class TvSeriesQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({ enum: TvSeriesCategory })
  @IsOptional()
  @IsEnum(TvSeriesCategory)
  category?: TvSeriesCategory;

  @ApiPropertyOptional({ enum: TvSeriesSortBy })
  @IsOptional()
  @IsEnum(TvSeriesSortBy)
  sort_by?: TvSeriesSortBy;

  @ApiPropertyOptional({ enum: TvSortOrder, default: TvSortOrder.DESC })
  @IsOptional()
  @IsEnum(TvSortOrder)
  sort_order: TvSortOrder = TvSortOrder.DESC;
}
