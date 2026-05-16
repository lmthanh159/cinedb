import { Module } from '@nestjs/common';

import { GenresController } from '@/modules/genres/genres.controller';
import { GenresService } from '@/modules/genres/genres.service';

@Module({
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
