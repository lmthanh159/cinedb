import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ example: 'Hayao Miyazaki' })
  @IsString()
  @Length(1, 300)
  name!: string;

  @ApiPropertyOptional({ example: '宮崎 駿' })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  originalName?: string;

  @ApiPropertyOptional({ example: 'Legendary animator and director.' })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({ example: '1941-01-05' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ example: '2050-01-05' })
  @IsOptional()
  @IsDateString()
  deathday?: string;

  @ApiPropertyOptional({ example: 'Tokyo, Japan' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  placeOfBirth?: string;

  @ApiPropertyOptional({ enum: GenderType, example: GenderType.MALE })
  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/profile.jpg' })
  @IsOptional()
  @IsString()
  profileUrl?: string;

  @ApiPropertyOptional({ example: 'Directing' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  knownForDepartment?: string;
}
