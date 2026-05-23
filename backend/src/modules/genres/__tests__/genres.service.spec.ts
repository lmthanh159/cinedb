import { HttpStatus } from '@nestjs/common';

import { GenresService } from '@/modules/genres/genres.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('GenresService', () => {
  const prismaService = {
    $transaction: jest.fn(),
    genre: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let genresService: GenresService;

  beforeEach(() => {
    jest.clearAllMocks();
    genresService = new GenresService(prismaService, redisService);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    prismaService.$transaction = jest.fn().mockImplementation(async (operations) => Promise.all(operations));
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

  it('returns admin genres with usage counts', async () => {
    prismaService.genre.count = jest.fn().mockResolvedValue(1);
    prismaService.genre.findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        tmdbId: 28,
        name: 'Action',
        slug: 'action',
        createdAt: new Date('2026-05-23T00:00:00.000Z'),
        updatedAt: new Date('2026-05-23T00:00:00.000Z'),
        _count: { movies: 4, tvSeries: 2 },
      },
    ]);

    const result = await genresService.getAdminGenres({
      page: 1,
      limit: 50,
      q: 'act',
    });

    expect(result.data[0]).toEqual({
      id: 1,
      tmdbId: 28,
      name: 'Action',
      slug: 'action',
      movieCount: 4,
      tvCount: 2,
      createdAt: new Date('2026-05-23T00:00:00.000Z'),
      updatedAt: new Date('2026-05-23T00:00:00.000Z'),
    });
    expect(result.meta).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
    expect(prismaService.genre.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50,
      }),
    );
  });

  it('creates a genre and invalidates public genre caches', async () => {
    prismaService.genre.create = jest.fn().mockResolvedValue({
      id: 3,
      tmdbId: null,
      name: 'Martial Arts',
      slug: 'martial-arts',
      createdAt: new Date('2026-05-23T00:00:00.000Z'),
      updatedAt: new Date('2026-05-23T00:00:00.000Z'),
      _count: { movies: 0, tvSeries: 0 },
    });

    const result = await genresService.createGenre({ name: 'Martial Arts' });

    expect(prismaService.genre.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Martial Arts',
          slug: 'martial-arts',
          tmdbId: null,
        },
      }),
    );
    expect(redisService.del).toHaveBeenCalledWith('genres:movie');
    expect(redisService.del).toHaveBeenCalledWith('genres:tv');
    expect(result.slug).toBe('martial-arts');
  });

  it('rejects deleting a genre that is linked to movies or TV series', async () => {
    prismaService.genre.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      _count: { movies: 1, tvSeries: 0 },
    });

    await expect(genresService.deleteGenre(1)).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
      }),
    });
    expect(prismaService.genre.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused genre and invalidates public genre caches', async () => {
    prismaService.genre.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      _count: { movies: 0, tvSeries: 0 },
    });
    prismaService.genre.delete = jest.fn().mockResolvedValue({ id: 1 });

    const result = await genresService.deleteGenre(1);

    expect(prismaService.genre.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(redisService.del).toHaveBeenCalledWith('genres:movie');
    expect(redisService.del).toHaveBeenCalledWith('genres:tv');
    expect(result).toEqual({ message: 'Genre deleted successfully' });
  });
});
