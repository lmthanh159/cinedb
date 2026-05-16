import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbWFpbC12ZXJpZnkiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.signature',
  })
  @IsJWT()
  token!: string;
}
