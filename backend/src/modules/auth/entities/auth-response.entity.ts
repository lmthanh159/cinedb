import { ApiProperty } from '@nestjs/swagger';

import { AuthUserEntity } from '@/modules/auth/entities/auth-user.entity';

export class MessageResponseEntity {
  @ApiProperty({
    example: 'Registration successful. Please verify your email.',
  })
  message!: string;
}

export class AccessTokenResponseEntity {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token.signature',
  })
  accessToken!: string;
}

export class AuthTokensResponseEntity extends AccessTokenResponseEntity {
  @ApiProperty({
    example: '92f7a270-04a8-4e42-93de-66315183d4e7',
  })
  refreshToken!: string;

  @ApiProperty({
    type: AuthUserEntity,
  })
  user!: AuthUserEntity;
}
