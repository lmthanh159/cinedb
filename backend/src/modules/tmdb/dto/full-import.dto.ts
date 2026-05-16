import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class FullImportDto {
  @ApiPropertyOptional({ example: 10, default: 10, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  moviePages = 10;

  @ApiPropertyOptional({ example: 5, default: 5, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  tvPages = 5;
}
