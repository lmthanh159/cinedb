import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REGEX,
} from '@/modules/auth/auth.constants';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Test@123456',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password!: string;

  @ApiProperty({
    example: 'Test User',
  })
  @IsString()
  @Length(2, 100)
  displayName!: string;
}
