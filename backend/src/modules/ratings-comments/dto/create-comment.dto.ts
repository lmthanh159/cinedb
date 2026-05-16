import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Movie id. Provide either movieId or seriesId, not both.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  movieId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'TV series id. Provide either movieId or seriesId, not both.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  seriesId?: number;

  @ApiProperty({
    example: 'Một bộ phim đáng xem.',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @Length(1, 5000)
  content!: string;
}
