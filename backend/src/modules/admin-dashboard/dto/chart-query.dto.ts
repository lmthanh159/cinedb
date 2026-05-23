import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum GenreDistributionMediaType {
  ALL = 'all',
  MOVIE = 'movie',
  TV = 'tv',
}

export class RatingsTimeSeriesQueryDto {
  @ApiPropertyOptional({ example: 30, default: 30, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;
}

export class TopMoviesChartQueryDto {
  @ApiPropertyOptional({ example: 10, default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({ example: 30, default: 30, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;
}

export class GenreDistributionQueryDto {
  @ApiPropertyOptional({ example: 10, default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    enum: GenreDistributionMediaType,
    default: GenreDistributionMediaType.ALL,
  })
  @IsOptional()
  @IsEnum(GenreDistributionMediaType)
  media_type: GenreDistributionMediaType = GenreDistributionMediaType.ALL;
}
