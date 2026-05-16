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

export class CreateMovieDto {
  @ApiProperty({
    example: 'CineDB Original Movie',
  })
  @IsString()
  @Length(1, 500)
  title!: string;

  @ApiPropertyOptional({
    example: 'CineDB Original Title',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  originalTitle?: string;

  @ApiPropertyOptional({
    example: 'A feature film created by the CineDB editorial team.',
  })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({
    example: '2026-05-14',
  })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({
    example: 126,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  runtime?: number;

  @ApiPropertyOptional({
    example: 'vi',
  })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  language?: string;

  @ApiPropertyOptional({
    example: 25000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    example: 100000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revenue?: number;

  @ApiPropertyOptional({
    example: 'Released',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  status?: string;

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
    example: [1, 5],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  companyIds?: number[];
}
