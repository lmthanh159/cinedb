import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
} from 'class-validator';

export class ReportCommentDto {
  @ApiProperty({
    example: 'Contains abusive language',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  reason!: string;
}
