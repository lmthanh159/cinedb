import { PartialType } from '@nestjs/swagger';

import { CreateGenreDto } from '@/modules/genres/dto/create-genre.dto';

export class UpdateGenreDto extends PartialType(CreateGenreDto) {}
