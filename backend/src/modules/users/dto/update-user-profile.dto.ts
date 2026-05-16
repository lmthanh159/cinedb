import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Movie enthusiast.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'vi' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  language?: string;
}
