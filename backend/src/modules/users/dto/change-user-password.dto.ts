import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Matches,
} from 'class-validator';

import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REGEX,
} from '@/modules/auth/auth.constants';

export class ChangeUserPasswordDto {
  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  oldPassword!: string;

  @ApiProperty({ example: 'Stronger@123' })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  newPassword!: string;
}
