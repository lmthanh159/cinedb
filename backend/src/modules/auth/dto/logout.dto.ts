import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    example: '92f7a270-04a8-4e42-93de-66315183d4e7',
  })
  @IsOptional()
  @IsUUID()
  refreshToken?: string;
}
