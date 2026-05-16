import { PartialType } from '@nestjs/swagger';

import { CreateSeasonDto } from '@/modules/tv-series/dto/create-season.dto';

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}
