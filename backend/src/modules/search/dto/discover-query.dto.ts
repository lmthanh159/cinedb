import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DiscoverQueryDto {
  @ApiPropertyOptional({ example: '28,12' })
  @IsOptional()
  @IsString()
  genres?: string;

  @ApiPropertyOptional({ example: 2020 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1880)
  year_min?: number;

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1880)
  year_max?: number;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 7 })
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(10)
  vote_min?: number;

  @ApiPropertyOptional({ example: 'popularity.desc' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'popularity.desc';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
