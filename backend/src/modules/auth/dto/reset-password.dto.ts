import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, Matches } from 'class-validator';

import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REGEX,
} from '@/modules/auth/auth.constants';

export class ResetPasswordDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXNzd29yZC1yZXNldCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSJ9.signature',
  })
  @IsJWT()
  token!: string;

  @ApiProperty({
    example: 'NewPass@123',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  newPassword!: string;
}
