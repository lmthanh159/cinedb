import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { TmdbApiException } from '@/modules/tmdb/tmdb-api.exception';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import { RedisService } from '@/redis/redis.service';

jest.mock('axios');

describe('TmdbClientService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const httpClient = {
    get: jest.fn(),
  } as unknown as AxiosInstance;
  const configValues = {
    TMDB_API_KEY: 'tmdb-key',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
    TMDB_RATE_LIMIT: '1000',
    TMDB_DEFAULT_LANGUAGE: 'vi-VN',
    TMDB_RETRY_BASE_DELAY_MS: '1',
  };
  const configService = {
    get: jest.fn((key: keyof typeof configValues, defaultValue?: string) =>
      configValues[key] ?? defaultValue,
    ),
  } as unknown as ConfigService;
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let tmdbClientService: TmdbClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(httpClient);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.set = jest.fn().mockResolvedValue(undefined);
    httpClient.get = jest.fn().mockResolvedValue({
      data: paginatedResponse(),
    });
    tmdbClientService = new TmdbClientService(configService, redisService);
  });

  function paginatedResponse() {
    return {
      page: 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    };
  }

  function axiosError(status: number, message = 'Rate limit exceeded') {
    return {
      isAxiosError: true,
      message,
      response: {
        status,
        data: {
          status_message: message,
        },
      },
    };
  }

  it('creates an axios client from TMDB env config and fetches movie details', async () => {
    const movie = {
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
    };
    httpClient.get = jest.fn().mockResolvedValue({ data: movie });

    const result = await tmdbClientService.getMovie(550, 'credits,videos,images');

    expect(result).toBe(movie);
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.themoviedb.org/3',
        params: {
          api_key: 'tmdb-key',
          language: 'vi-VN',
        },
      }),
    );
    expect(httpClient.get).toHaveBeenCalledWith('/movie/550', {
      params: {
        append_to_response: 'credits,videos,images',
      },
    });
    expect(redisService.set).toHaveBeenCalledWith(
      expect.stringContaining('tmdb::movie:550:'),
      movie,
      3600,
    );
  });

  it('returns cached responses without calling TMDB', async () => {
    const cached = {
      id: 1,
      title: 'Cached Movie',
    };
    redisService.get = jest.fn().mockResolvedValue(cached);

    const result = await tmdbClientService.getMovie(1);

    expect(result).toBe(cached);
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('maps movie endpoints to the expected TMDB paths and params', async () => {
    await tmdbClientService.getPopularMovies(2);
    await tmdbClientService.getNowPlayingMovies(3);
    await tmdbClientService.getUpcomingMovies(4);
    await tmdbClientService.getTopRatedMovies(5);
    await tmdbClientService.searchMovies('batman', 6);
    await tmdbClientService.getMovieChanges('2026-05-01', '2026-05-15', 7);
    await tmdbClientService.getTVChanges('2026-05-01', '2026-05-15', 8);
    await tmdbClientService.getMovieVideos(550, 'en-US');

    expect(httpClient.get).toHaveBeenNthCalledWith(1, '/movie/popular', {
      params: { page: 2 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, '/movie/now_playing', {
      params: { page: 3 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(3, '/movie/upcoming', {
      params: { page: 4 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(4, '/movie/top_rated', {
      params: { page: 5 },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(5, '/search/movie', {
      params: { page: 6, query: 'batman' },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(6, '/movie/changes', {
      params: {
        end_date: '2026-05-15',
        page: 7,
        start_date: '2026-05-01',
      },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(7, '/tv/changes', {
      params: {
        end_date: '2026-05-15',
        page: 8,
        start_date: '2026-05-01',
      },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(8, '/movie/550/videos', {
      params: { language: 'en-US' },
    });
  });

  it('maps TV, people, genre, and trending methods to TMDB paths', async () => {
    httpClient.get = jest
      .fn()
      .mockResolvedValueOnce({ data: { id: 1399, name: 'Game of Thrones' } })
      .mockResolvedValueOnce({ data: { results: [] } })
      .mockResolvedValueOnce({ data: paginatedResponse() })
      .mockResolvedValueOnce({ data: { id: 1, season_number: 1, episodes: [] } })
      .mockResolvedValueOnce({ data: paginatedResponse() })
      .mockResolvedValueOnce({ data: { id: 31, name: 'Tom Hanks' } })
      .mockResolvedValueOnce({ data: paginatedResponse() })
      .mockResolvedValueOnce({ data: { genres: [{ id: 28, name: 'Action' }] } })
      .mockResolvedValueOnce({ data: { genres: [{ id: 18, name: 'Drama' }] } })
      .mockResolvedValueOnce({ data: paginatedResponse() });

    await tmdbClientService.getTVSeries(1399, 'credits');
    await tmdbClientService.getTVSeriesVideos(1399, 'en-US', 'en-US,en,null');
    await tmdbClientService.getPopularTV(2);
    await tmdbClientService.getTVSeason(1399, 1);
    await tmdbClientService.searchTV('dark', 3);
    await tmdbClientService.getPerson(31, 'movie_credits');
    await tmdbClientService.searchPeople('tom', 4);
    const movieGenres = await tmdbClientService.getMovieGenres();
    const tvGenres = await tmdbClientService.getTVGenres();
    await tmdbClientService.getTrending('movie', 'day');

    expect(movieGenres).toEqual([{ id: 28, name: 'Action' }]);
    expect(tvGenres).toEqual([{ id: 18, name: 'Drama' }]);
    expect(httpClient.get).toHaveBeenNthCalledWith(1, '/tv/1399', {
      params: { append_to_response: 'credits' },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, '/tv/1399/videos', {
      params: {
        include_video_language: 'en-US,en,null',
        language: 'en-US',
      },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(4, '/tv/1399/season/1', {
      params: {},
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(6, '/person/31', {
      params: { append_to_response: 'movie_credits' },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(10, '/trending/movie/day', {
      params: {},
    });
  });

  it('builds TMDB image URLs and preserves null paths', () => {
    expect(tmdbClientService.getImageUrl('/poster.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/poster.jpg',
    );
    expect(tmdbClientService.getImageUrl(null, 'original')).toBeNull();
  });

  it('retries 429 and 5xx responses before returning successful data', async () => {
    const success = {
      id: 550,
      title: 'Recovered',
    };
    httpClient.get = jest
      .fn()
      .mockRejectedValueOnce(axiosError(429))
      .mockRejectedValueOnce(axiosError(500, 'Server error'))
      .mockResolvedValueOnce({ data: success });

    const result = await tmdbClientService.getMovie(550);

    expect(result).toBe(success);
    expect(httpClient.get).toHaveBeenCalledTimes(3);
  });

  it('throws a TMDB API exception for non-retryable errors', async () => {
    httpClient.get = jest.fn().mockRejectedValue(axiosError(404, 'Not found'));

    await expect(tmdbClientService.getMovie(999999)).rejects.toBeInstanceOf(TmdbApiException);
  });

  it('wraps unexpected client errors in a TMDB API exception', async () => {
    httpClient.get = jest.fn().mockRejectedValue(new Error('socket closed'));

    await expect(tmdbClientService.getMovie(1)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Unexpected TMDB client error.',
      }),
    });
  });

  it('spaces consecutive TMDB calls through the rate limiter', async () => {
    const fastConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'TMDB_RATE_LIMIT') {
          return '50';
        }

        return configValues[key as keyof typeof configValues] ?? defaultValue;
      }),
    } as unknown as ConfigService;
    const callTimes: number[] = [];

    httpClient.get = jest.fn().mockImplementation(() => {
      callTimes.push(Date.now());

      return Promise.resolve({ data: paginatedResponse() });
    });
    tmdbClientService = new TmdbClientService(fastConfigService, redisService);

    const startedAt = Date.now();

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        tmdbClientService.getPopularMovies(index + 1),
      ),
    );

    expect(callTimes).toHaveLength(10);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(150);
  });
});
