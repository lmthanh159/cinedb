import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';

@Injectable()
export class TmdbSchedulerService {
  private readonly logger = new Logger(TmdbSchedulerService.name);

  constructor(private readonly tmdbSyncService: TmdbSyncService) {}

  @Cron('0 3 * * *')
  async handleDailySync() {
    this.logger.log('Starting scheduled TMDB daily sync.');
    await this.tmdbSyncService.dailySync();
  }

  @Cron('0 * * * *')
  async handleTrendingSync() {
    this.logger.log('Starting scheduled TMDB trending sync.');
    await this.tmdbSyncService.syncTrending();
  }
}
