import { Module } from '@nestjs/common';

import {
  AdminPeopleController,
  PeopleController,
} from '@/modules/people/people.controller';
import { PeopleService } from '@/modules/people/people.service';

@Module({
  controllers: [PeopleController, AdminPeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
