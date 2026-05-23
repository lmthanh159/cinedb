import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ModerateCommentDto {
  @ApiPropertyOptional({ enum: CommentStatus })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiPropertyOptional({ example: 'Updated by moderation team.', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  content?: string;

  @ApiPropertyOptional({ example: true, description: 'Mark pending reports for this comment as resolved.' })
  @IsOptional()
  @IsBoolean()
  resolveReports?: boolean;

  @ApiPropertyOptional({ example: 'Violates community guidelines.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
