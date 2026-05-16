import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({
    example: 8,
    minimum: 1,
    maximum: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  score!: number;
}
