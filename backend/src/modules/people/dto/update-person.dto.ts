import { PartialType } from '@nestjs/swagger';

import { CreatePersonDto } from '@/modules/people/dto/create-person.dto';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
