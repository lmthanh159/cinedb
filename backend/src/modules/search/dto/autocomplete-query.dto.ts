import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class AutocompleteQueryDto {
  @ApiPropertyOptional({ example: 'bat' })
  @IsString()
  @Length(2, 100)
  query!: string;

  @ApiPropertyOptional({ example: 5, default: 5, maximum: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
