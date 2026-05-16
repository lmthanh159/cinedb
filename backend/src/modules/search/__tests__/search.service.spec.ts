import { ElasticsearchService } from '@/modules/search/elasticsearch.service';
import { SearchService } from '@/modules/search/search.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('SearchService', () => {
  const elasticsearchService = {
    isAvailable: jest.fn(),
    search: jest.fn(),
  } as unknown as ElasticsearchService;

  const prismaService = {
    $transaction: jest.fn(),
    movie: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    tVSeries: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    person: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new SearchService(elasticsearchService, prismaService, redisService);
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(true);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);
  });

  function esResponse(source: Record<string, unknown>, score = 10, total = 1) {
    return {
      hits: {
        total: { value: total },
        hits: [
          {
            _score: score,
            _source: source,
          },
        ],
      },
    };
  }

  function movieRecord() {
    return {
      id: 1,
      title: 'Movie Result',
      posterUrl: 'poster.jpg',
      releaseDate: new Date('2025-01-01T00:00:00.000Z'),
      voteAverage: 8.1,
      popularity: 99,
    };
  }

  function seriesRecord() {
    return {
      id: 2,
      title: 'TV Result',
      posterUrl: 'poster.jpg',
      firstAirDate: new Date('2024-01-01T00:00:00.000Z'),
      voteAverage: 7.8,
      popularity: 80,
    };
  }

  it('searches across movies, TV, and people using Elasticsearch', async () => {
    elasticsearchService.search = jest
      .fn()
      .mockResolvedValueOnce(esResponse({
        id: 1,
        title: 'Movie',
        releaseYear: 2025,
        posterUrl: 'poster.jpg',
        voteAverage: 8,
        popularity: 90,
      }, 9))
      .mockResolvedValueOnce(esResponse({
        id: 2,
        title: 'Series',
        releaseYear: 2024,
        posterUrl: 'poster.jpg',
        voteAverage: 7,
        popularity: 80,
      }, 8))
      .mockResolvedValueOnce(esResponse({
        id: 3,
        name: 'Person',
        profileUrl: 'profile.jpg',
        popularity: 70,
      }, 7));

    const result = await searchService.multiSearch({
      query: 'movie',
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(3);
    expect(result.data[0].mediaType).toBe('movie');
    expect(result.meta.total).toBe(3);
  });

  it('falls back to Prisma for multi search when Elasticsearch is unavailable', async () => {
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(false);
    prismaService.$transaction = jest
      .fn()
      .mockResolvedValueOnce([1, [movieRecord()]])
      .mockResolvedValueOnce([1, [seriesRecord()]])
      .mockResolvedValueOnce([
        1,
        [
          {
            id: 3,
            name: 'Person Result',
            profileUrl: 'profile.jpg',
            popularity: 10,
          },
        ],
      ]);

    const result = await searchService.multiSearch({
      query: 'result',
      page: 1,
      limit: 5,
    });

    expect(result.data.map((item) => item.mediaType)).toEqual(['movie', 'tv', 'person']);
    expect(result.meta.total).toBe(3);
  });

  it('searches movies through fallback path', async () => {
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(false);
    prismaService.$transaction = jest.fn().mockResolvedValue([1, [movieRecord()]]);

    const result = await searchService.searchMovies({
      query: 'movie',
      page: 1,
      limit: 20,
    });

    expect(result.data[0].title).toBe('Movie Result');
    expect(result.data[0].year).toBe(2025);
  });

  it('searches TV and people through fallback path', async () => {
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(false);
    prismaService.$transaction = jest
      .fn()
      .mockResolvedValueOnce([1, [seriesRecord()]])
      .mockResolvedValueOnce([
        1,
        [
          {
            id: 3,
            name: 'Person Result',
            profileUrl: null,
            popularity: 9,
          },
        ],
      ]);

    const tv = await searchService.searchTv({
      query: 'tv',
      page: 1,
      limit: 20,
    });
    const people = await searchService.searchPeople({
      query: 'person',
      page: 1,
      limit: 20,
    });

    expect(tv.data[0].mediaType).toBe('tv');
    expect(people.data[0].mediaType).toBe('person');
  });

  it('returns cached autocomplete suggestions', async () => {
    redisService.get = jest.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          text: 'Cached',
          mediaType: 'movie',
        },
      ],
    });

    const result = await searchService.autocomplete({
      query: 'ca',
      limit: 5,
    });

    expect(result.data[0]).toEqual({
      id: 1,
      text: 'Cached',
      mediaType: 'movie',
    });
    expect(elasticsearchService.search).not.toHaveBeenCalled();
  });

  it('builds autocomplete suggestions from Elasticsearch and caches them', async () => {
    elasticsearchService.search = jest
      .fn()
      .mockResolvedValueOnce(esResponse({ id: 1, title: 'Movie', posterUrl: null }))
      .mockResolvedValueOnce(esResponse({ id: 2, title: 'TV', posterUrl: null }))
      .mockResolvedValueOnce(esResponse({ id: 3, name: 'Person', profileUrl: null }));

    const result = await searchService.autocomplete({
      query: 'mo',
      limit: 5,
    });

    expect(result.data).toHaveLength(3);
    expect(redisService.set).toHaveBeenCalledWith(
      'search:autocomplete:mo:5',
      result,
      300,
    );
  });

  it('falls back for autocomplete when Elasticsearch is unavailable', async () => {
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(false);
    prismaService.movie.findMany = jest.fn().mockResolvedValue([
      { id: 1, title: 'Movie', posterUrl: null },
    ]);
    prismaService.tVSeries.findMany = jest.fn().mockResolvedValue([
      { id: 2, title: 'TV', posterUrl: null },
    ]);
    prismaService.person.findMany = jest.fn().mockResolvedValue([
      { id: 3, name: 'Person', profileUrl: null },
    ]);

    const result = await searchService.autocomplete({
      query: 'mo',
      limit: 2,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].mediaType).toBe('movie');
  });

  it('discovers movies with Elasticsearch filters', async () => {
    elasticsearchService.search = jest.fn().mockResolvedValue(esResponse({
      id: 1,
      title: 'Movie',
      releaseYear: 2025,
      posterUrl: null,
      voteAverage: 8,
      popularity: 90,
    }));

    const result = await searchService.discoverMovies({
      genres: '28,12',
      year_min: 2020,
      year_max: 2026,
      country: 'US',
      vote_min: 7,
      sort_by: 'popularity.desc',
      page: 1,
      limit: 20,
    });

    expect(result.data[0].mediaType).toBe('movie');
    expect(elasticsearchService.search).toHaveBeenCalledWith(
      'movies',
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.any(Object),
        }),
      }),
    );
  });

  it('falls back for TV discover when Elasticsearch is unavailable', async () => {
    elasticsearchService.isAvailable = jest.fn().mockResolvedValue(false);
    prismaService.$transaction = jest.fn().mockResolvedValue([1, [seriesRecord()]]);

    const result = await searchService.discoverTv({
      genres: '1',
      year_min: 2020,
      country: 'US',
      vote_min: 7,
      sort_by: 'voteAverage.desc',
      page: 1,
      limit: 20,
    });

    expect(result.data[0].mediaType).toBe('tv');
  });
});
