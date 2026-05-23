import { Module } from '@nestjs/common';

import {
  AdminGenresController,
  GenresController,
} from '@/modules/genres/genres.controller';
import { GenresService } from '@/modules/genres/genres.service';

@Module({
  controllers: [GenresController, AdminGenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
