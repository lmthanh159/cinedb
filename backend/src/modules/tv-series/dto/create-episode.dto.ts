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

export class CreateEpisodeDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  episodeNumber!: number;

  @ApiPropertyOptional({ example: 'Pilot' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ example: 'The first episode of the season.' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ example: '2026-05-14' })
  @IsOptional()
  @IsDateString()
  airDate?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  runtime?: number;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/still.jpg' })
  @IsOptional()
  @IsString()
  stillUrl?: string;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  voteAverage?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  voteCount?: number;
}
