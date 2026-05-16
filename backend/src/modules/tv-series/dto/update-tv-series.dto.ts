import { PartialType } from '@nestjs/swagger';

import { CreateTvSeriesDto } from '@/modules/tv-series/dto/create-tv-series.dto';

export class UpdateTvSeriesDto extends PartialType(CreateTvSeriesDto) {}
