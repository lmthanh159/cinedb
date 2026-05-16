import { HttpException, HttpStatus } from '@nestjs/common';

import {
  TvSeriesCategory,
  TvSeriesSortBy,
  TvSortOrder,
} from '@/modules/tv-series/dto/tv-series-query.dto';
import { TvSeriesService } from '@/modules/tv-series/tv-series.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('TvSeriesService', () => {
  const prismaService = {
    $transaction: jest.fn(),
    tVSeries: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    season: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    episode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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

  let tvSeriesService: TvSeriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    tvSeriesService = new TvSeriesService(prismaService, redisService);
  });

  function createSeries(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      tmdbId: 9001,
      title: 'Sample Series',
      originalTitle: 'Sample Series Original',
      overview: 'Series overview',
      firstAirDate: new Date('2024-01-01T00:00:00.000Z'),
      lastAirDate: new Date('2024-03-01T00:00:00.000Z'),
      status: 'Returning Series',
      numberOfSeasons: 2,
      numberOfEpisodes: 20,
      voteAverage: 8.4,
      voteCount: 200,
      tmdbVoteAverage: 8.6,
      tmdbVoteCount: 400,
      popularity: 140,
      posterUrl: 'poster.jpg',
      backdropUrl: 'backdrop.jpg',
      isDeleted: false,
      genres: [{ id: 1, name: 'Drama', slug: 'drama' }],
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

  it('gets popular TV series with pagination', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.$transaction = jest.fn().mockResolvedValue([
      2,
      [createSeries(), createSeries({ id: 2, title: 'Series 2' })],
    ]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await tvSeriesService.getTvSeries({
      page: 1,
      limit: 20,
      category: TvSeriesCategory.POPULAR,
      sort_by: undefined,
      sort_order: TvSortOrder.DESC,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.totalPages).toBe(1);
  });

  it('gets top rated TV series', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.$transaction = jest.fn().mockResolvedValue([1, [createSeries()]]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await tvSeriesService.getTvSeries({
      page: 1,
      limit: 20,
      category: TvSeriesCategory.TOP_RATED,
      sort_by: TvSeriesSortBy.VOTE_AVERAGE,
      sort_order: TvSortOrder.DESC,
    });

    expect(result.data[0].title).toBe('Sample Series');
  });

  it('returns cached series detail on cache hit', async () => {
    redisService.get = jest.fn().mockResolvedValue({
      id: 1,
      title: 'Cached Series',
    });

    const result = await tvSeriesService.getTvSeriesById(1);

    expect(result).toEqual({
      id: 1,
      title: 'Cached Series',
    });
  });

  it('gets series detail on cache miss', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue(
      createSeries({
        seasons: [{ seasonNumber: 1, name: 'Season 1', episodeCount: 10, posterUrl: 's1.jpg' }],
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
        trailers: [],
        images: [],
        countries: [{ id: 1, isoCode: 'US', name: 'United States' }],
        companies: [{ id: 1, name: 'Studio', logoUrl: null, originCountry: 'US' }],
      }),
    );
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await tvSeriesService.getTvSeriesById(1);

    expect((result as { seasons: unknown[] }).seasons).toHaveLength(1);
    expect((result as { cast: unknown[] }).cast).toHaveLength(1);
  });

  it('throws 404 for missing series detail', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(tvSeriesService.getTvSeriesById(999), HttpStatus.NOT_FOUND);
  });

  it('gets credits and videos', async () => {
    prismaService.tVSeries.findFirst = jest
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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

    const credits = await tvSeriesService.getTvSeriesCredits(1);
    const videos = await tvSeriesService.getTvSeriesVideos(1);

    expect(credits.cast).toHaveLength(1);
    expect(videos.results).toHaveLength(1);
  });

  it('gets similar TV series', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue({
      id: 1,
      genres: [{ id: 1 }, { id: 2 }],
      crew: [{ personId: 99 }],
    });
    prismaService.tVSeries.findMany = jest.fn().mockResolvedValue([
      createSeries({
        id: 2,
        genres: [{ id: 1, name: 'Drama', slug: 'drama' }, { id: 2, name: 'Mystery', slug: 'mystery' }],
        crew: [],
      }),
      createSeries({
        id: 3,
        title: 'Director Match',
        genres: [{ id: 7, name: 'Comedy', slug: 'comedy' }],
        crew: [{ personId: 99 }],
      }),
    ]);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const result = await tvSeriesService.getSimilarTvSeries(1);

    expect(result.data).toHaveLength(2);
  });

  it('returns empty similar series when no source signals exist', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue({
      id: 1,
      genres: [],
      crew: [],
    });

    const result = await tvSeriesService.getSimilarTvSeries(1);

    expect(result.data).toEqual([]);
  });

  it('gets season and episode detail', async () => {
    redisService.get = jest.fn().mockResolvedValue(null);
    prismaService.season.findFirst = jest.fn().mockResolvedValue({
      seasonNumber: 1,
      name: 'Season 1',
      overview: 'Overview',
      airDate: new Date(),
      posterUrl: 's1.jpg',
      episodeCount: 2,
      episodes: [
        {
          episodeNumber: 1,
          name: 'Pilot',
          overview: 'Episode overview',
          airDate: new Date(),
          runtime: 45,
          stillUrl: 'still.jpg',
          voteAverage: 8.5,
          voteCount: 100,
        },
      ],
    });
    prismaService.episode.findFirst = jest.fn().mockResolvedValue({
      episodeNumber: 1,
      name: 'Pilot',
      overview: 'Episode overview',
      airDate: new Date(),
      runtime: 45,
      stillUrl: 'still.jpg',
      voteAverage: 8.5,
      voteCount: 100,
    });
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const season = await tvSeriesService.getSeason(1, 1);
    const episode = await tvSeriesService.getEpisode(1, 1, 1);

    expect((season as { episodes: unknown[] }).episodes).toHaveLength(1);
    expect((episode as { episodeNumber: number }).episodeNumber).toBe(1);
  });

  it('creates and updates a series', async () => {
    prismaService.genre.count = jest.fn().mockResolvedValue(1);
    prismaService.country.count = jest.fn().mockResolvedValue(0);
    prismaService.productionCompany.count = jest.fn().mockResolvedValue(0);
    prismaService.tVSeries.create = jest.fn().mockResolvedValue({ id: 10 });
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue({
      id: 10,
      isDeleted: false,
      tmdbId: 100,
    });
    prismaService.tVSeries.update = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(tvSeriesService, 'getTvSeriesById').mockResolvedValue({ id: 10 } as never);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const created = await tvSeriesService.createTvSeries({
      title: 'Created Series',
      genreIds: [1],
    });
    const updated = await tvSeriesService.updateTvSeries(10, {
      title: 'Updated Series',
      genreIds: [1],
    });

    expect(created).toEqual({ id: 10 });
    expect(updated).toEqual({ id: 10 });
  });

  it('soft deletes a series', async () => {
    prismaService.tVSeries.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      isDeleted: false,
    });
    prismaService.tVSeries.update = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);

    const result = await tvSeriesService.deleteTvSeries(1);

    expect(result.message).toBe('TV series deleted successfully');
  });

  it('creates, updates and deletes season and episode', async () => {
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.season.create = jest.fn().mockResolvedValue({ seasonNumber: 1 });
    prismaService.season.findFirst = jest.fn().mockImplementation((query: { include?: { episodes?: unknown }; where?: { seasonNumber?: number } }) => {
      const seasonNumber = query.where?.seasonNumber ?? 1;

      if (query.include?.episodes) {
        return Promise.resolve({
          id: 11,
          seriesId: 1,
          seasonNumber,
          name: `Season ${seasonNumber}`,
          overview: null,
          airDate: null,
          posterUrl: null,
          episodeCount: 1,
          episodes: [
            {
              episodeNumber: seasonNumber,
              name: seasonNumber === 1 ? 'Pilot' : 'Episode 2',
              overview: null,
              airDate: null,
              runtime: null,
              stillUrl: null,
              voteAverage: 0,
              voteCount: 0,
            },
          ],
        });
      }

      return Promise.resolve({
        id: 11,
        seriesId: 1,
        seasonNumber,
      });
    });
    prismaService.season.update = jest.fn().mockResolvedValue(undefined);
    prismaService.season.delete = jest.fn().mockResolvedValue(undefined);
    prismaService.season.findMany = jest.fn().mockResolvedValue([{ id: 11, episodeCount: 1 }]);
    prismaService.episode.create = jest.fn().mockResolvedValue({ episodeNumber: 1 });
    prismaService.episode.findFirst = jest.fn().mockImplementation((query: { where?: { episodeNumber?: number } }) => {
      const episodeNumber = query.where?.episodeNumber ?? 1;

      return Promise.resolve({
        id: 21,
        seasonId: 11,
        episodeNumber,
        name: episodeNumber === 1 ? 'Pilot' : 'Episode 2',
        overview: null,
        airDate: null,
        runtime: null,
        stillUrl: null,
        voteAverage: 0,
        voteCount: 0,
      });
    });
    prismaService.episode.update = jest.fn().mockResolvedValue(undefined);
    prismaService.episode.delete = jest.fn().mockResolvedValue(undefined);
    prismaService.episode.count = jest.fn().mockResolvedValue(1);
    prismaService.tVSeries.update = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    const createdSeason = await tvSeriesService.createSeason(1, {
      seasonNumber: 1,
    });
    const updatedSeason = await tvSeriesService.updateSeason(1, 1, {
      seasonNumber: 2,
      name: 'Season 2',
    });
    const createdEpisode = await tvSeriesService.createEpisode(1, 1, {
      episodeNumber: 1,
    });
    const updatedEpisode = await tvSeriesService.updateEpisode(1, 1, 1, {
      episodeNumber: 2,
      name: 'Episode 2',
    });
    const deletedEpisode = await tvSeriesService.deleteEpisode(1, 1, 1);
    const deletedSeason = await tvSeriesService.deleteSeason(1, 1);

    expect((createdSeason as { seasonNumber: number }).seasonNumber).toBe(1);
    expect((updatedSeason as { seasonNumber: number }).seasonNumber).toBe(2);
    expect((createdEpisode as { episodeNumber: number }).episodeNumber).toBe(1);
    expect((updatedEpisode as { episodeNumber: number }).episodeNumber).toBe(2);
    expect(deletedEpisode.message).toBe('Episode deleted successfully');
    expect(deletedSeason.message).toBe('Season deleted successfully');
  });
});
