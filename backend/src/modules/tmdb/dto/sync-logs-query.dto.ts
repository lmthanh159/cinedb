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

export class SyncLogsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ example: 'FULL_IMPORT' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  syncType?: string;

  @ApiPropertyOptional({ example: 'MOVIE' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  entityType?: string;
}
