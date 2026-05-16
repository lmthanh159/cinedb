import { TmdbSchedulerService } from '@/modules/tmdb/tmdb-scheduler.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';

describe('TmdbSchedulerService', () => {
  const tmdbSyncService = {
    dailySync: jest.fn(),
    syncTrending: jest.fn(),
  } as unknown as TmdbSyncService;
  let scheduler: TmdbSchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new TmdbSchedulerService(tmdbSyncService);
    tmdbSyncService.dailySync = jest.fn().mockResolvedValue({});
    tmdbSyncService.syncTrending = jest.fn().mockResolvedValue({});
  });

  it('runs daily sync from scheduler', async () => {
    await scheduler.handleDailySync();

    expect(tmdbSyncService.dailySync).toHaveBeenCalled();
  });

  it('runs trending sync from scheduler', async () => {
    await scheduler.handleTrendingSync();

    expect(tmdbSyncService.syncTrending).toHaveBeenCalled();
  });
});
