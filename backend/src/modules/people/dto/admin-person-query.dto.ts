import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum AdminPersonSortBy {
  NAME = 'name',
  POPULARITY = 'popularity',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum AdminPersonSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class AdminPersonQueryDto {
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

  @ApiPropertyOptional({ example: 'miyazaki' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: AdminPersonSortBy, default: AdminPersonSortBy.POPULARITY })
  @IsOptional()
  @IsEnum(AdminPersonSortBy)
  sort_by: AdminPersonSortBy = AdminPersonSortBy.POPULARITY;

  @ApiPropertyOptional({ enum: AdminPersonSortOrder, default: AdminPersonSortOrder.DESC })
  @IsOptional()
  @IsEnum(AdminPersonSortOrder)
  sort_order: AdminPersonSortOrder = AdminPersonSortOrder.DESC;
}
