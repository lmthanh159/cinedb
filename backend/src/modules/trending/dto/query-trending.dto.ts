import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum TrendingMediaType {
  MOVIE = 'movie',
  TV = 'tv',
  ALL = 'all',
}

export enum TrendingTimeWindow {
  DAY = 'day',
  WEEK = 'week',
}

export class TrendingParamsDto {
  @ApiProperty({ enum: TrendingMediaType, example: TrendingMediaType.MOVIE })
  @IsEnum(TrendingMediaType)
  mediaType!: TrendingMediaType;

  @ApiProperty({ enum: TrendingTimeWindow, example: TrendingTimeWindow.DAY })
  @IsEnum(TrendingTimeWindow)
  timeWindow!: TrendingTimeWindow;
}

export class QueryTrendingDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
