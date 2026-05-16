import { Module } from '@nestjs/common';

import { TrendingController } from '@/modules/trending/trending.controller';
import { TrendingService } from '@/modules/trending/trending.service';

@Module({
  controllers: [TrendingController],
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule {}
