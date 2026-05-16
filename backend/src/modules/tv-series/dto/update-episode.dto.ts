import { PartialType } from '@nestjs/swagger';

import { CreateEpisodeDto } from '@/modules/tv-series/dto/create-episode.dto';

export class UpdateEpisodeDto extends PartialType(CreateEpisodeDto) {}
