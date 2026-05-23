import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateGenreDto {
  @ApiProperty({ example: 'Action', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ example: 'action', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  slug?: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tmdbId?: number;
}
