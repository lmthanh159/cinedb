import { GenresService } from '@/modules/genres/genres.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('GenresService', () => {
  const prismaService = {
    genre: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let genresService: GenresService;

  beforeEach(() => {
    jest.clearAllMocks();
    genresService = new GenresService(prismaService, redisService);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);
  });

  it('returns cached movie genres', async () => {
    const cached = {
      data: [{ id: 1, tmdbId: 28, name: 'Action', slug: 'action', count: 3 }],
    };
    redisService.get = jest.fn().mockResolvedValue(cached);

    const result = await genresService.getMovieGenres();

    expect(result).toBe(cached);
    expect(prismaService.genre.findMany).not.toHaveBeenCalled();
  });

  it('returns movie genres with active movie counts and caches them', async () => {
    prismaService.genre.findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        tmdbId: 28,
        name: 'Action',
        slug: 'action',
        _count: { movies: 4 },
      },
    ]);

    const result = await genresService.getMovieGenres();

    expect(result.data[0]).toEqual({
      id: 1,
      tmdbId: 28,
      name: 'Action',
      slug: 'action',
      count: 4,
    });
    expect(redisService.set).toHaveBeenCalledWith('genres:movie', result, 86400);
    expect(prismaService.genre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { movies: { some: { isDeleted: false } } },
      }),
    );
  });

  it('returns TV genres with active series counts and caches them', async () => {
    prismaService.genre.findMany = jest.fn().mockResolvedValue([
      {
        id: 2,
        tmdbId: 18,
        name: 'Drama',
        slug: 'drama',
        _count: { tvSeries: 7 },
      },
    ]);

    const result = await genresService.getTvGenres();

    expect(result.data[0].count).toBe(7);
    expect(redisService.set).toHaveBeenCalledWith('genres:tv', result, 86400);
    expect(prismaService.genre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tvSeries: { some: { isDeleted: false } } },
      }),
    );
  });
});
