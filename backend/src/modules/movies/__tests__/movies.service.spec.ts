import { HttpException, HttpStatus } from '@nestjs/common';

import { MovieCategory, MovieSortBy, SortOrder } from '@/modules/movies/dto/movie-query.dto';
import { MovieReviewsSortBy } from '@/modules/movies/dto/movie-reviews-query.dto';
import { MoviesService } from '@/modules/movies/movies.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('MoviesService', () => {
  const prismaService = {
    $transaction: jest.fn(),
    movie: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rating: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
    },
    genre: {
      count: jest.fn(),
    },
    country: {
      count: jest.fn(),
    },
    productionCompany: {
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  } as unknown as RedisService;

  let moviesService: MoviesService;

  beforeEach(() => {
    jest.clearAllMocks();
    moviesService = new MoviesService(prismaService, redisService);
  });

  function createMovie(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      tmdbId: 1001,
      title: 'Sample Movie',
      originalTitle: 'Sample Movie Original',
      overview: 'Overview',
      releaseDate: new Date('2024-01-01T00:00:00.000Z'),
      runtime: 120,
      language: 'en',
      budget: BigInt(1000),
      revenue: BigInt(2000),
      status: 'Released',
      voteAverage: 8.1,
      voteCount: 150,
      tmdbVoteAverage: 8.2,
      tmdbVoteCount: 200,
      popularity: 90,
      posterUrl: 'poster.jpg',
      backdropUrl: 'backdrop.jpg',
      isDeleted: false,
      genres: [
        {
          id: 1,
          name: 'Action',
          slug: 'action',
        },
      ],
      ...overrides,
    };
  }

  async function expectHttpStatus(promise: Promise<unknown>, status: HttpStatus) {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
    }
  }

  it('gets popular movies with pagination', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.$transaction = jest.fn().mockResolvedValue([
      2,
      [createMovie(), createMovie({ id: 2, title: 'Movie 2' })],
    ]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.getMovies({
      page: 1,
      limit: 20,
      category: MovieCategory.POPULAR,
      sort_by: undefined,
      sort_order: SortOrder.DESC,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.totalPages).toBe(1);
    expect(prismaService.$transaction).toHaveBeenCalled();
  });

  it('gets top rated movies and serializes bigint fields', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.$transaction = jest.fn().mockResolvedValue([1, [createMovie()]]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.getMovies({
      page: 1,
      limit: 20,
      category: MovieCategory.TOP_RATED,
      sort_by: MovieSortBy.VOTE_AVERAGE,
      sort_order: SortOrder.DESC,
    });

    expect(result.data[0].budget).toBe('1000');
    expect(result.data[0].revenue).toBe('2000');
  });

  it('returns cached movie detail on cache hit', async () => {
    redisService.get = jest.fn().mockResolvedValue({
      id: 1,
      title: 'Cached Movie',
    });

    const result = await moviesService.getMovieById(1);

    expect(result).toEqual({
      id: 1,
      title: 'Cached Movie',
    });
    expect(prismaService.movie.findFirst).not.toHaveBeenCalled();
  });

  it('gets movie detail on cache miss', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.movie.findFirst = jest.fn().mockResolvedValue(
      createMovie({
        cast: [
          {
            person: { id: 10, name: 'Actor', profileUrl: 'actor.jpg' },
            character: 'Hero',
            displayOrder: 0,
          },
        ],
        crew: [
          {
            person: { id: 20, name: 'Director', profileUrl: 'director.jpg' },
            job: 'Director',
            department: 'Directing',
          },
        ],
        trailers: [],
        images: [],
        countries: [{ id: 1, isoCode: 'US', name: 'United States' }],
        companies: [{ id: 1, name: 'Studio', logoUrl: null, originCountry: 'US' }],
      }),
    );
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.getMovieById(1);

    expect((result as { cast: unknown[] }).cast).toHaveLength(1);
    expect((result as { crew: unknown[] }).crew).toHaveLength(1);
    expect((result as { stats: { voteAverage: number } }).stats.voteAverage).toBe(8.1);
    expect(redisService.set).toHaveBeenCalled();
  });

  it('throws 404 for missing movie detail', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.movie.findFirst = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(moviesService.getMovieById(999), HttpStatus.NOT_FOUND);
  });

  it('gets movie credits', async () => {
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({
      cast: [
        {
          person: { id: 1, name: 'Actor', profileUrl: null },
          character: 'Lead',
          displayOrder: 0,
        },
      ],
      crew: [
        {
          person: { id: 2, name: 'Director', profileUrl: null },
          job: 'Director',
          department: 'Directing',
        },
      ],
    });

    const result = await moviesService.getMovieCredits(1);

    expect(result.cast).toHaveLength(1);
    expect(result.crew).toHaveLength(1);
  });

  it('gets movie images with fallback poster and backdrop', async () => {
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({
      posterUrl: 'poster.jpg',
      backdropUrl: 'backdrop.jpg',
      images: [],
    });

    const result = await moviesService.getMovieImages(1);

    expect(result.posters[0].filePath).toBe('poster.jpg');
    expect(result.backdrops[0].filePath).toBe('backdrop.jpg');
  });

  it('gets movie videos', async () => {
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({
      trailers: [
        {
          id: 1,
          name: 'Trailer',
          key: 'abc',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          publishedAt: new Date(),
        },
      ],
    });

    const result = await moviesService.getMovieVideos(1);

    expect(result.results).toHaveLength(1);
  });

  it('gets similar movies with overlap filtering', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.movie.findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: 1,
        genres: [{ id: 1 }, { id: 2 }, { id: 3 }],
        crew: [{ personId: 99 }],
      });
    prismaService.movie.findMany = jest.fn().mockResolvedValue([
      createMovie({
        id: 2,
        genres: [{ id: 1, name: 'Action', slug: 'action' }, { id: 2, name: 'Drama', slug: 'drama' }],
        crew: [],
      }),
      createMovie({
        id: 3,
        title: 'Director Match',
        genres: [{ id: 5, name: 'Comedy', slug: 'comedy' }],
        crew: [{ personId: 99 }],
      }),
      createMovie({
        id: 4,
        title: 'Filtered Out',
        genres: [{ id: 6, name: 'Sci-Fi', slug: 'sci-fi' }],
        crew: [],
      }),
    ]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.getSimilarMovies(1);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe(2);
  });

  it('returns empty similar movies when source movie has no genres or directors', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({
      id: 1,
      genres: [],
      crew: [],
    });

    const result = await moviesService.getSimilarMovies(1);

    expect(result.data).toEqual([]);
  });

  it('gets paginated reviews merged with active comments', async () => {
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.$transaction = jest.fn().mockResolvedValue([
      1,
      [
        {
          userId: 'user-1',
          score: 9,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            displayName: 'Reviewer',
            avatarUrl: null,
          },
        },
      ],
    ]);
    prismaService.comment.findMany = jest.fn().mockResolvedValue([
      {
        userId: 'user-1',
        content: 'Excellent movie',
      },
    ]);

    const result = await moviesService.getMovieReviews(1, {
      page: 1,
      limit: 10,
      sort_by: MovieReviewsSortBy.CREATED_AT,
      sort_order: SortOrder.DESC,
    });

    expect(result.data[0].comment).toBe('Excellent movie');
    expect(result.meta.total).toBe(1);
  });

  it('creates a movie and invalidates caches', async () => {
    prismaService.genre.count = jest.fn().mockResolvedValue(2);
    prismaService.country.count = jest.fn().mockResolvedValue(1);
    prismaService.productionCompany.count = jest.fn().mockResolvedValue(1);
    prismaService.movie.create = jest.fn().mockResolvedValue({ id: 11 });
    jest.spyOn(moviesService, 'getMovieById').mockResolvedValue({ id: 11 } as never);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.createMovie({
      title: 'Created Movie',
      genreIds: [1, 2],
      countryIds: [1],
      companyIds: [1],
    });

    expect(result).toEqual({ id: 11 });
    expect(prismaService.movie.create).toHaveBeenCalled();
    expect(redisService.delPattern).toHaveBeenCalledWith('movies:*');
  });

  it('rejects create when genres do not exist', async () => {
    prismaService.genre.count = jest.fn().mockResolvedValue(1);
    prismaService.country.count = jest.fn().mockResolvedValue(0);
    prismaService.productionCompany.count = jest.fn().mockResolvedValue(0);

    await expectHttpStatus(
      moviesService.createMovie({
        title: 'Invalid Movie',
        genreIds: [1, 2],
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('updates a movie and marks tmdb imports as admin edited', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      isDeleted: false,
      tmdbId: 1001,
    });
    prismaService.genre.count = jest.fn().mockResolvedValue(1);
    prismaService.country.count = jest.fn().mockResolvedValue(0);
    prismaService.productionCompany.count = jest.fn().mockResolvedValue(0);
    prismaService.movie.update = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(moviesService, 'getMovieById').mockResolvedValue({ id: 1 } as never);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.updateMovie(1, {
      title: 'Updated Title',
      genreIds: [1],
    });

    expect(result).toEqual({ id: 1 });
    expect(prismaService.movie.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAdminEdited: true,
        }),
      }),
    );
  });

  it('throws 404 when updating missing movie', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      moviesService.updateMovie(999, {
        title: 'No Movie',
      }),
      HttpStatus.NOT_FOUND,
    );
  });

  it('throws 404 when deleting a missing movie', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(moviesService.deleteMovie(999), HttpStatus.NOT_FOUND);
  });

  it('soft deletes a movie', async () => {
    prismaService.movie.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      isDeleted: false,
    });
    prismaService.movie.update = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await moviesService.deleteMovie(1);

    expect(result.message).toBe('Movie deleted successfully');
    expect(prismaService.movie.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        isDeleted: true,
      },
    });
  });
});
