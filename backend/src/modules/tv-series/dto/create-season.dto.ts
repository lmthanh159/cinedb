import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  seasonNumber!: number;

  @ApiPropertyOptional({ example: 'Season 1' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ example: 'The opening season of the series.' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ example: '2026-05-14' })
  @IsOptional()
  @IsDateString()
  airDate?: string;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/season.jpg' })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  episodeCount?: number;
}
