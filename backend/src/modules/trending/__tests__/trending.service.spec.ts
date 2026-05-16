import {
  TrendingMediaType,
  TrendingTimeWindow,
} from '@/modules/trending/dto/query-trending.dto';
import { TrendingService } from '@/modules/trending/trending.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('TrendingService', () => {
  const prismaService = {
    movie: {
      findMany: jest.fn(),
    },
    tVSeries: {
      findMany: jest.fn(),
    },
    rating: {
      groupBy: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let trendingService: TrendingService;

  beforeEach(() => {
    jest.clearAllMocks();
    trendingService = new TrendingService(prismaService, redisService);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);
  });

  function movieRecord(id: number, overrides: Record<string, unknown> = {}) {
    return {
      id,
      title: `Movie ${id}`,
      releaseDate: new Date('2026-01-01T00:00:00.000Z'),
      posterUrl: null,
      backdropUrl: null,
      voteAverage: 8,
      voteCount: 100,
      popularity: 50,
      genres: [{ id: 1, name: 'Action', slug: 'action' }],
      ...overrides,
    };
  }

  function seriesRecord(id: number, overrides: Record<string, unknown> = {}) {
    return {
      id,
      title: `Series ${id}`,
      firstAirDate: new Date('2026-01-01T00:00:00.000Z'),
      posterUrl: null,
      backdropUrl: null,
      voteAverage: 7,
      voteCount: 80,
      popularity: 40,
      genres: [{ id: 2, name: 'Drama', slug: 'drama' }],
      ...overrides,
    };
  }

  it('returns cached trending results', async () => {
    const cached = {
      data: [{ id: 1, title: 'Cached Movie' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    redisService.get = jest.fn().mockResolvedValue(cached);

    const result = await trendingService.getTrending(
      TrendingMediaType.MOVIE,
      TrendingTimeWindow.DAY,
      { page: 1, limit: 20 },
    );

    expect(result).toBe(cached);
    expect(prismaService.movie.findMany).not.toHaveBeenCalled();
  });

  it('calculates movie trending score and caches a paginated response', async () => {
    prismaService.movie.findMany = jest.fn().mockResolvedValue([
      movieRecord(1, { popularity: 10, voteCount: 10 }),
      movieRecord(2, { popularity: 100, voteCount: 200 }),
    ]);
    prismaService.rating.groupBy = jest.fn().mockResolvedValue([
      {
        movieId: 1,
        _count: { _all: 5 },
      },
    ]);

    const result = await trendingService.getTrending(
      TrendingMediaType.MOVIE,
      TrendingTimeWindow.DAY,
      { page: 1, limit: 10 },
    );

    expect(result.data[0].id).toBe(2);
    expect(result.data[1].trendingScore).toBe(10 * 0.5 + 10 * 0.3 + 5 * 0.2);
    expect(result.meta.total).toBe(2);
    expect(redisService.set).toHaveBeenCalledWith(
      'trending:movie:day:1:limit:10',
      result,
      3600,
    );
  });

  it('combines movies and TV series for all media trending', async () => {
    prismaService.movie.findMany = jest.fn().mockResolvedValue([
      movieRecord(1, { popularity: 20, voteCount: 20 }),
    ]);
    prismaService.tVSeries.findMany = jest.fn().mockResolvedValue([
      seriesRecord(2, { popularity: 200, voteCount: 100 }),
    ]);
    prismaService.rating.groupBy = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          seriesId: 2,
          _count: { _all: 10 },
        },
      ]);

    const result = await trendingService.getTrending(
      TrendingMediaType.ALL,
      TrendingTimeWindow.WEEK,
      { page: 1, limit: 20 },
    );

    expect(result.data.map((item) => item.mediaType)).toEqual(['tv', 'movie']);
    expect(result.meta.total).toBe(2);
  });

  it('refreshes first-page cache hourly for day and week windows', async () => {
    prismaService.movie.findMany = jest.fn().mockResolvedValue([movieRecord(1)]);
    prismaService.tVSeries.findMany = jest.fn().mockResolvedValue([seriesRecord(2)]);
    prismaService.rating.groupBy = jest.fn().mockResolvedValue([]);

    await trendingService.refreshTrendingCache();

    expect(redisService.set).toHaveBeenCalledWith(
      'trending:movie:day:1:limit:20',
      expect.objectContaining({ meta: expect.objectContaining({ total: 1 }) }),
      3600,
    );
    expect(redisService.set).toHaveBeenCalledWith(
      'trending:all:week:1:limit:20',
      expect.objectContaining({ meta: expect.objectContaining({ total: 2 }) }),
      3600,
    );
  });
});
