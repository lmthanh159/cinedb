import { Module } from '@nestjs/common';

import { RecommendationsController } from '@/modules/recommendations/recommendations.controller';
import { RecommendationsService } from '@/modules/recommendations/recommendations.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
