import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTvSeriesDto {
  @ApiProperty({
    example: 'CineDB Original Series',
  })
  @IsString()
  @Length(1, 500)
  title!: string;

  @ApiPropertyOptional({
    example: 'CineDB Original Series Title',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  originalTitle?: string;

  @ApiPropertyOptional({
    example: 'A prestige television series produced for the CineDB platform.',
  })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({
    example: '2026-05-14',
  })
  @IsOptional()
  @IsDateString()
  firstAirDate?: string;

  @ApiPropertyOptional({
    example: '2026-06-14',
  })
  @IsOptional()
  @IsDateString()
  lastAirDate?: string;

  @ApiPropertyOptional({
    example: 'Returning Series',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  status?: string;

  @ApiPropertyOptional({
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  numberOfSeasons?: number;

  @ApiPropertyOptional({
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  numberOfEpisodes?: number;

  @ApiProperty({
    example: [1, 2],
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  genreIds!: number[];

  @ApiPropertyOptional({
    example: [1],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  countryIds?: number[];

  @ApiPropertyOptional({
    example: [1, 3],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  companyIds?: number[];
}
