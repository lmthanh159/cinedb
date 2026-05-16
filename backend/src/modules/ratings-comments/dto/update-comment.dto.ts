import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
} from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Cập nhật nhận xét sau khi xem lại.',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @Length(1, 5000)
  content!: string;
}
