import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';
import { TmdbController } from '@/modules/tmdb/tmdb.controller';

describe('TmdbController', () => {
  const tmdbClientService = {
    searchMovies: jest.fn(),
    searchTV: jest.fn(),
  } as unknown as TmdbClientService;
  const tmdbSyncService = {
    fullImport: jest.fn(),
    importSingleMovie: jest.fn(),
    importSingleTV: jest.fn(),
    dailySync: jest.fn(),
    getSyncLogs: jest.fn(),
  } as unknown as TmdbSyncService;
  let controller: TmdbController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TmdbController(tmdbClientService, tmdbSyncService);
  });

  it('delegates import endpoints to sync service', async () => {
    tmdbSyncService.fullImport = jest.fn().mockResolvedValue({ movies: {}, tvSeries: {} });
    tmdbSyncService.importSingleMovie = jest.fn().mockResolvedValue({ id: 1 });
    tmdbSyncService.importSingleTV = jest.fn().mockResolvedValue({ id: 2 });

    await expect(controller.fullImport({ moviePages: 1, tvPages: 1 })).resolves.toEqual({
      movies: {},
      tvSeries: {},
    });
    await expect(controller.importMovie(550)).resolves.toEqual({ id: 1 });
    await expect(controller.importTv(1399)).resolves.toEqual({ id: 2 });

    expect(tmdbSyncService.fullImport).toHaveBeenCalledWith({ moviePages: 1, tvPages: 1 });
    expect(tmdbSyncService.importSingleMovie).toHaveBeenCalledWith(550);
    expect(tmdbSyncService.importSingleTV).toHaveBeenCalledWith(1399);
  });

  it('delegates TMDB search and sync log endpoints', async () => {
    tmdbClientService.searchMovies = jest.fn().mockResolvedValue({ results: [] });
    tmdbClientService.searchTV = jest.fn().mockResolvedValue({ results: [] });
    tmdbSyncService.dailySync = jest.fn().mockResolvedValue({ movies: {}, tvSeries: {} });
    tmdbSyncService.getSyncLogs = jest.fn().mockResolvedValue({ data: [], meta: {} });

    await controller.searchMovies({ query: 'batman', page: 1 });
    await controller.searchTv({ query: 'dark', page: 2 });
    await controller.dailySync();
    await controller.getSyncLogs({ page: 1, limit: 20 });

    expect(tmdbClientService.searchMovies).toHaveBeenCalledWith('batman', 1);
    expect(tmdbClientService.searchTV).toHaveBeenCalledWith('dark', 2);
    expect(tmdbSyncService.dailySync).toHaveBeenCalled();
    expect(tmdbSyncService.getSyncLogs).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });
});
