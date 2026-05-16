import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserEntity {
  @ApiProperty({
    example: '15363e81-dde7-4882-a196-cce0a6aa471c',
  })
  id!: string;

  @ApiProperty({
    example: 'admin@cinedb.com',
  })
  email!: string;

  @ApiProperty({
    example: 'CineDB Admin',
  })
  displayName!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  role!: UserRole;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}
