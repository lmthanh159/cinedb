import { Module } from '@nestjs/common';

import { SearchModule } from '@/modules/search/search.module';
import {
  AdminTvSeriesController,
  TvSeriesController,
} from '@/modules/tv-series/tv-series.controller';
import { TvSeriesService } from '@/modules/tv-series/tv-series.service';

@Module({
  imports: [SearchModule],
  controllers: [TvSeriesController, AdminTvSeriesController],
  providers: [TvSeriesService],
  exports: [TvSeriesService],
})
export class TvSeriesModule {}
