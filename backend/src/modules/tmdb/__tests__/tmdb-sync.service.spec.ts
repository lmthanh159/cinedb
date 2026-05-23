import { SearchSyncService } from '@/modules/search/search-sync.service';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { TmdbMapperService } from '@/modules/tmdb/tmdb-mapper.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('TmdbSyncService', () => {
  const tmdbClientService = {
    getMovie: jest.fn(),
    getMovieVideos: jest.fn(),
    getTVSeries: jest.fn(),
    getTVSeriesVideos: jest.fn(),
    getTVSeason: jest.fn(),
    getPopularMovies: jest.fn(),
    getPopularTV: jest.fn(),
    getMovieChanges: jest.fn(),
    getTVChanges: jest.fn(),
    getTrending: jest.fn(),
  } as unknown as TmdbClientService;
  const tmdbMapperService = {
    toMovie: jest.fn(),
    toTVSeries: jest.fn(),
    toSeason: jest.fn(),
    toCast: jest.fn(),
    toCrew: jest.fn(),
    toTrailers: jest.fn(),
    toImages: jest.fn(),
  } as unknown as TmdbMapperService;
  const prismaService = {
    $transaction: jest.fn(),
    movie: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    tVSeries: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    genre: { upsert: jest.fn() },
    country: { upsert: jest.fn() },
    productionCompany: { upsert: jest.fn() },
    person: { upsert: jest.fn() },
    movieCast: { deleteMany: jest.fn(), createMany: jest.fn() },
    movieCrew: { deleteMany: jest.fn(), createMany: jest.fn() },
    seriesCast: { deleteMany: jest.fn(), createMany: jest.fn() },
    seriesCrew: { deleteMany: jest.fn(), createMany: jest.fn() },
    trailer: { deleteMany: jest.fn(), createMany: jest.fn() },
    image: { deleteMany: jest.fn(), createMany: jest.fn() },
    season: { upsert: jest.fn() },
    episode: { deleteMany: jest.fn(), createMany: jest.fn() },
    tmdbSyncLog: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;
  const redisService = {
    del: jest.fn(),
    delPattern: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;
  const searchSyncService = {
    syncAll: jest.fn(),
    syncMovie: jest.fn(),
    syncSeries: jest.fn(),
  } as unknown as SearchSyncService;

  let syncService: TmdbSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = new TmdbSyncService(
      tmdbClientService,
      tmdbMapperService,
      prismaService,
      redisService,
      searchSyncService,
    );
    prismaService.genre.upsert = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.country.upsert = jest.fn().mockResolvedValue({ id: 2 });
    prismaService.productionCompany.upsert = jest.fn().mockResolvedValue({ id: 3 });
    prismaService.person.upsert = jest
      .fn()
      .mockResolvedValueOnce({ id: 10, tmdbId: 100 })
      .mockResolvedValueOnce({ id: 11, tmdbId: 101 });
    prismaService.movieCast.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.movieCrew.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.seriesCast.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.seriesCrew.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.trailer.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.image.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.movieCast.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.movieCrew.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.seriesCast.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.seriesCrew.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.trailer.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.image.createMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.tmdbSyncLog.create = jest
      .fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    prismaService.tmdbSyncLog.update = jest.fn().mockResolvedValue({});
    searchSyncService.syncAll = jest.fn().mockResolvedValue({ movies: 1, tvSeries: 0, people: 2 });
    searchSyncService.syncMovie = jest.fn().mockResolvedValue(undefined);
    searchSyncService.syncSeries = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);
    redisService.set = jest.fn().mockResolvedValue(undefined);
    tmdbClientService.getMovieVideos = jest.fn().mockResolvedValue({ results: [] });
    tmdbClientService.getTVSeriesVideos = jest.fn().mockResolvedValue({ results: [] });
    setupMovieMapping();
    setupSeriesMapping();
  });

  function movieDetail() {
    return {
      id: 550,
      title: 'Fight Club',
      genres: [{ id: 18, name: 'Drama' }],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
      production_companies: [{ id: 1, name: 'Studio', logo_path: null, origin_country: 'US' }],
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      images: { posters: [], backdrops: [] },
    };
  }

  function seriesDetail() {
    return {
      id: 1399,
      name: 'Game of Thrones',
      genres: [{ id: 18, name: 'Drama' }],
      production_countries: [{ iso_3166_1: 'US', name: 'United States' }],
      production_companies: [{ id: 1, name: 'Studio', logo_path: null, origin_country: 'US' }],
      seasons: [{ season_number: 1 }],
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      images: { posters: [], backdrops: [] },
    };
  }

  function setupMovieMapping() {
    tmdbMapperService.toMovie = jest.fn().mockReturnValue({
      data: {
        tmdbId: 550,
        title: 'Fight Club',
        tmdbLastSynced: new Date('2026-05-15T00:00:00.000Z'),
      },
      genreTmdbIds: [18],
      countries: [{ isoCode: 'US', name: 'United States' }],
      companies: [{ tmdbId: 1, name: 'Studio', logoUrl: null, originCountry: 'US' }],
    });
    tmdbMapperService.toCast = jest.fn().mockReturnValue({
      people: [{ tmdbId: 100, name: 'Actor' }],
      cast: [{ personTmdbId: 100, character: 'Narrator', displayOrder: 0 }],
    });
    tmdbMapperService.toCrew = jest.fn().mockReturnValue({
      people: [{ tmdbId: 101, name: 'Director' }],
      crew: [{ personTmdbId: 101, job: 'Director', department: 'Directing' }],
    });
    tmdbMapperService.toTrailers = jest.fn().mockReturnValue([{ key: 'abc', site: 'YouTube' }]);
    tmdbMapperService.toImages = jest.fn().mockReturnValue([{ filePath: 'poster.jpg', type: 'poster' }]);
  }

  function setupSeriesMapping() {
    tmdbMapperService.toTVSeries = jest.fn().mockReturnValue({
      data: {
        tmdbId: 1399,
        title: 'Game of Thrones',
        tmdbLastSynced: new Date('2026-05-15T00:00:00.000Z'),
      },
      genreTmdbIds: [18],
      countries: [{ isoCode: 'US', name: 'United States' }],
      companies: [{ tmdbId: 1, name: 'Studio', logoUrl: null, originCountry: 'US' }],
    });
    tmdbMapperService.toSeason = jest.fn().mockReturnValue({
      data: { tmdbId: 1, seasonNumber: 1, episodeCount: 1 },
      episodes: [{ tmdbId: 2, episodeNumber: 1, name: 'Winter Is Coming' }],
    });
  }

  it('imports one movie, writes relations/media, and syncs search', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getMovie = jest.fn().mockResolvedValue(movieDetail());
    prismaService.movie.upsert = jest.fn().mockResolvedValue({ id: 5, title: 'Fight Club' });
    prismaService.movie.update = jest.fn().mockResolvedValue({ id: 5 });

    const result = await syncService.importSingleMovie(550);

    expect(result.id).toBe(5);
    expect(prismaService.movie.upsert).toHaveBeenCalled();
    expect(prismaService.movieCast.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ movieId: 5, personId: 10 })],
      }),
    );
    expect(searchSyncService.syncMovie).toHaveBeenCalledWith(5);
    expect(searchSyncService.syncMovie).toHaveBeenCalledTimes(1);
  });

  it('returns an existing movie without importing it again', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue({ id: 5, tmdbId: 550 });

    const result = await syncService.importSingleMovie(550);

    expect(result).toEqual({ id: 5, tmdbId: 550 });
    expect(tmdbClientService.getMovie).not.toHaveBeenCalled();
  });

  it('imports one TV series with seasons and syncs search', async () => {
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getTVSeries = jest.fn().mockResolvedValue(seriesDetail());
    tmdbClientService.getTVSeason = jest.fn().mockResolvedValue({
      id: 1,
      season_number: 1,
      episodes: [],
    });
    prismaService.tVSeries.upsert = jest.fn().mockResolvedValue({ id: 7, title: 'Game of Thrones' });
    prismaService.tVSeries.update = jest.fn().mockResolvedValue({ id: 7 });
    prismaService.season.upsert = jest.fn().mockResolvedValue({ id: 70 });
    prismaService.episode.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.episode.createMany = jest.fn().mockResolvedValue({ count: 1 });

    const result = await syncService.importSingleTV(1399);

    expect(result.id).toBe(7);
    expect(prismaService.season.upsert).toHaveBeenCalled();
    expect(searchSyncService.syncSeries).toHaveBeenCalledWith(7);
    expect(searchSyncService.syncSeries).toHaveBeenCalledTimes(1);
  });

  it('uses English movie videos as fallback when localized trailers are missing', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getMovie = jest.fn().mockResolvedValue(movieDetail());
    tmdbClientService.getMovieVideos = jest.fn().mockResolvedValue({
      results: [
        {
          id: 'en-trailer',
          name: 'Official Trailer',
          key: 'fallback-key',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          published_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    tmdbMapperService.toTrailers = jest
      .fn()
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ key: 'fallback-key', site: 'YouTube' }]);
    prismaService.movie.upsert = jest.fn().mockResolvedValue({ id: 5, title: 'Fight Club' });
    prismaService.movie.update = jest.fn().mockResolvedValue({ id: 5 });

    await syncService.importSingleMovie(550);

    expect(tmdbClientService.getMovieVideos).toHaveBeenCalledWith(550, 'en-US');
    expect(prismaService.trailer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ key: 'fallback-key', movieId: 5 })],
      }),
    );
  });

  it('uses English TV videos as fallback when localized trailers are missing', async () => {
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getTVSeries = jest.fn().mockResolvedValue(seriesDetail());
    tmdbClientService.getTVSeriesVideos = jest.fn().mockResolvedValue({
      results: [
        {
          id: 'en-trailer',
          name: 'Official Trailer',
          key: 'fallback-key',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          published_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    tmdbClientService.getTVSeason = jest.fn().mockResolvedValue({
      id: 1,
      season_number: 1,
      episodes: [],
    });
    tmdbMapperService.toTrailers = jest
      .fn()
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ key: 'fallback-key', site: 'YouTube' }]);
    prismaService.tVSeries.upsert = jest.fn().mockResolvedValue({ id: 7, title: 'Game of Thrones' });
    prismaService.tVSeries.update = jest.fn().mockResolvedValue({ id: 7 });
    prismaService.season.upsert = jest.fn().mockResolvedValue({ id: 70 });
    prismaService.episode.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    prismaService.episode.createMany = jest.fn().mockResolvedValue({ count: 1 });

    await syncService.importSingleTV(1399);

    expect(tmdbClientService.getTVSeriesVideos).toHaveBeenCalledWith(
      1399,
      'en-US',
      'en-US,en,null',
    );
    expect(prismaService.trailer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ key: 'fallback-key', seriesId: 7 })],
      }),
    );
  });

  it('runs full import and records sync logs', async () => {
    tmdbClientService.getPopularMovies = jest.fn().mockResolvedValue({
      results: [{ id: 550 }],
    });
    tmdbClientService.getPopularTV = jest.fn().mockResolvedValue({
      results: [],
    });
    prismaService.movie.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getMovie = jest.fn().mockResolvedValue(movieDetail());
    prismaService.movie.upsert = jest.fn().mockResolvedValue({ id: 5, title: 'Fight Club' });
    prismaService.movie.update = jest.fn().mockResolvedValue({ id: 5 });

    const result = await syncService.fullImport({ moviePages: 1, tvPages: 1 });

    expect(result.movies.totalCreated).toBe(1);
    expect(prismaService.tmdbSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ totalProcessed: 1, status: 'SUCCESS' }),
      }),
    );
    expect(searchSyncService.syncAll).toHaveBeenCalled();
    expect(searchSyncService.syncMovie).not.toHaveBeenCalled();
  });

  it('marks full import logs as failed when a fatal TMDB request fails', async () => {
    tmdbClientService.getPopularMovies = jest
      .fn()
      .mockRejectedValue(new Error('tmdb unavailable'));

    await expect(syncService.fullImport({ moviePages: 1, tvPages: 1 })).rejects.toThrow(
      'tmdb unavailable',
    );

    expect(prismaService.tmdbSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'FAILED',
          totalErrors: 1,
          errorDetails: [
            expect.objectContaining({
              entityType: 'MOVIE',
              tmdbId: -1,
              message: 'Error: tmdb unavailable',
            }),
          ],
        }),
      }),
    );
    expect(prismaService.tmdbSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({
          status: 'FAILED',
          totalErrors: 1,
          errorDetails: [
            expect.objectContaining({
              entityType: 'TV',
              tmdbId: -1,
              message: 'Error: tmdb unavailable',
            }),
          ],
        }),
      }),
    );
  });

  it('skips daily changes for admin-edited records', async () => {
    tmdbClientService.getMovieChanges = jest.fn().mockResolvedValue({
      results: [{ id: 550 }],
    });
    tmdbClientService.getTVChanges = jest.fn().mockResolvedValue({
      results: [{ id: 1399 }],
    });
    prismaService.movie.findUnique = jest.fn().mockResolvedValue({ id: 5, isAdminEdited: true });
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue({ id: 7, isAdminEdited: true });

    const result = await syncService.dailySync();

    expect(result.movies.totalProcessed).toBe(0);
    expect(tmdbClientService.getMovie).not.toHaveBeenCalled();
  });

  it('syncs changed daily movie and TV records to search incrementally', async () => {
    tmdbClientService.getMovieChanges = jest.fn().mockResolvedValue({
      results: [{ id: 550 }],
    });
    tmdbClientService.getTVChanges = jest.fn().mockResolvedValue({
      results: [{ id: 1399 }],
    });
    prismaService.movie.findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 5, tmdbId: 550, isAdminEdited: false })
      .mockResolvedValueOnce({ id: 5, tmdbId: 550 })
      .mockResolvedValueOnce({ id: 5, tmdbId: 550, isAdminEdited: false });
    prismaService.tVSeries.findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 7, tmdbId: 1399, isAdminEdited: false })
      .mockResolvedValueOnce({ id: 7, tmdbId: 1399 })
      .mockResolvedValueOnce({ id: 7, tmdbId: 1399, isAdminEdited: false });
    tmdbClientService.getMovie = jest.fn().mockResolvedValue(movieDetail());
    tmdbClientService.getTVSeries = jest.fn().mockResolvedValue(seriesDetail());
    tmdbClientService.getTVSeason = jest.fn().mockResolvedValue({
      id: 1,
      season_number: 1,
      episodes: [],
    });
    tmdbMapperService.toCast = jest.fn().mockReturnValue({ people: [], cast: [] });
    tmdbMapperService.toCrew = jest.fn().mockReturnValue({ people: [], crew: [] });
    prismaService.movie.upsert = jest.fn().mockResolvedValue({ id: 5, title: 'Fight Club' });
    prismaService.movie.update = jest.fn().mockResolvedValue({ id: 5 });
    prismaService.tVSeries.upsert = jest.fn().mockResolvedValue({ id: 7, title: 'Game of Thrones' });
    prismaService.tVSeries.update = jest.fn().mockResolvedValue({ id: 7 });
    prismaService.season.upsert = jest.fn().mockResolvedValue({ id: 70 });

    const result = await syncService.dailySync();

    expect(result.movies.totalUpdated).toBe(1);
    expect(result.tvSeries.totalUpdated).toBe(1);
    expect(searchSyncService.syncMovie).toHaveBeenCalledWith(5);
    expect(searchSyncService.syncSeries).toHaveBeenCalledWith(7);
    expect(searchSyncService.syncAll).not.toHaveBeenCalled();
  });

  it('imports missing trending media and caches TMDB trending lists', async () => {
    tmdbClientService.getTrending = jest
      .fn()
      .mockResolvedValueOnce({ results: [{ id: 550 }] })
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [] });
    prismaService.movie.findUnique = jest.fn().mockResolvedValueOnce(null).mockResolvedValue(null);
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue(null);
    tmdbClientService.getMovie = jest.fn().mockResolvedValue(movieDetail());
    prismaService.movie.upsert = jest.fn().mockResolvedValue({ id: 5, title: 'Fight Club' });
    prismaService.movie.update = jest.fn().mockResolvedValue({ id: 5 });

    const result = await syncService.syncTrending();

    expect(result.movie_day).toBe(1);
    expect(redisService.set).toHaveBeenCalledWith(
      'tmdb:trending:movie:day',
      { results: [{ id: 550 }] },
      3600,
    );
  });

  it('returns paginated sync logs', async () => {
    const startedAt = new Date('2026-05-16T04:00:00.000Z');
    const completedAt = new Date('2026-05-16T04:30:00.000Z');
    prismaService.$transaction = jest.fn().mockResolvedValue([
      1,
      [
        {
          id: 1,
          syncType: 'FULL_IMPORT',
          entityType: 'MOVIE',
          status: 'COMPLETED_WITH_ERRORS',
          startedAt,
          completedAt,
        },
      ],
    ]);

    const result = await syncService.getSyncLogs({ page: 1, limit: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.data[0].syncType).toBe('FULL_IMPORT');
    expect(result.data[0].status).toBe('COMPLETED_WITH_ERRORS');
    expect(result.data[0].startedAt).toBe(startedAt);
    expect(result.data[0].completedAt).toBe(completedAt);
  });
});
