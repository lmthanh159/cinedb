import { Module } from '@nestjs/common';

import { SearchModule } from '@/modules/search/search.module';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { TmdbMapperService } from '@/modules/tmdb/tmdb-mapper.service';
import { TmdbSchedulerService } from '@/modules/tmdb/tmdb-scheduler.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';
import { TmdbController } from '@/modules/tmdb/tmdb.controller';

@Module({
  imports: [SearchModule],
  controllers: [TmdbController],
  providers: [
    TmdbClientService,
    TmdbMapperService,
    TmdbSchedulerService,
    TmdbSyncService,
  ],
  exports: [TmdbClientService, TmdbMapperService, TmdbSyncService],
})
export class TmdbModule {}
