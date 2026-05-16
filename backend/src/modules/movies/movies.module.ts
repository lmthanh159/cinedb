import { Module } from '@nestjs/common';

import {
  AdminMoviesController,
  MoviesController,
} from '@/modules/movies/movies.controller';
import { MoviesService } from '@/modules/movies/movies.service';
import { SearchModule } from '@/modules/search/search.module';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';

@Module({
  imports: [SearchModule, TmdbModule],
  controllers: [MoviesController, AdminMoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
