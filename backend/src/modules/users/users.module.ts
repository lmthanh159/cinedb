import { Module } from '@nestjs/common';

import {
  AdminUsersController,
  UsersController,
} from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
