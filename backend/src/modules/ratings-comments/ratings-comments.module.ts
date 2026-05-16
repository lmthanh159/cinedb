import { Module } from '@nestjs/common';

import {
  CommentsController,
  RatingsController,
} from '@/modules/ratings-comments/ratings-comments.controller';
import { RatingsCommentsService } from '@/modules/ratings-comments/ratings-comments.service';

@Module({
  controllers: [RatingsController, CommentsController],
  providers: [RatingsCommentsService],
  exports: [RatingsCommentsService],
})
export class RatingsCommentsModule {}
