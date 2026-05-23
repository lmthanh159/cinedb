import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class LockUserDto {
  @ApiPropertyOptional({
    default: 30,
    description: 'Lock duration in minutes.',
    example: 30,
    maximum: 10080,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  minutes?: number = 30;

  @ApiPropertyOptional({ example: 'Violation of community guidelines.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
