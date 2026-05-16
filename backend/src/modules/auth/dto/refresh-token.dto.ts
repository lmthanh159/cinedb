import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: '92f7a270-04a8-4e42-93de-66315183d4e7',
  })
  @IsUUID()
  refreshToken!: string;
}
