import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@cinedb.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Admin@123',
  })
  @IsString()
  password!: string;
}
