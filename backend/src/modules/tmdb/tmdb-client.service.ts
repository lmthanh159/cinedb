import {
  createHash,
} from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosError,
  AxiosInstance,
} from 'axios';
import Bottleneck from 'bottleneck';

import {
  TmdbChanges,
  TmdbGenre,
  TmdbGenresResponse,
  TmdbImageSize,
  TmdbMediaType,
  TmdbMovie,
  TmdbMovieDetail,
  TmdbPaginatedResponse,
  TmdbPerson,
  TmdbPersonDetail,
  TmdbSeasonDetail,
  TmdbTimeWindow,
  TmdbTVDetail,
  TmdbTVSeries,
  TmdbVideos,
} from '@/modules/tmdb/interfaces/tmdb.interface';
import { TmdbApiException } from '@/modules/tmdb/tmdb-api.exception';
import { RedisService } from '@/redis/redis.service';

type TmdbRequestParams = Record<string, string | number | boolean | undefined>;

@Injectable()
export class TmdbClientService {
  private readonly httpClient: AxiosInstance;
  private readonly limiter: Bottleneck;
  private readonly imageBaseUrl: string;
  private readonly defaultLanguage: string;
  private readonly cacheTtl = 3600;
  private readonly maxRetries = 3;
  private readonly retryBaseDelayMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const apiKey = this.configService.get<string>('TMDB_API_KEY', '');
    const baseUrl = this.configService.get<string>(
      'TMDB_BASE_URL',
      'https://api.themoviedb.org/3',
    );
    const rateLimit = Number(this.configService.get<string>('TMDB_RATE_LIMIT', '4')) || 4;

    this.defaultLanguage = this.configService.get<string>('TMDB_DEFAULT_LANGUAGE', 'vi-VN');
    this.imageBaseUrl = this.configService.get<string>(
      'TMDB_IMAGE_BASE_URL',
      'https://image.tmdb.org/t/p/',
    );
    this.retryBaseDelayMs = Number(
      this.configService.get<string>('TMDB_RETRY_BASE_DELAY_MS', '200'),
    );
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      params: {
        api_key: apiKey,
        language: this.defaultLanguage,
      },
    });
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: Math.ceil(1000 / rateLimit),
    });
  }

  async getMovie(
    tmdbId: number,
    appendToResponse?: string,
  ): Promise<TmdbMovieDetail> {
    return this.get<TmdbMovieDetail>(`/movie/${tmdbId}`, {
      append_to_response: appendToResponse,
    });
  }

  async getMovieVideos(
    tmdbId: number,
    language = 'en-US',
  ): Promise<TmdbVideos> {
    return this.get<TmdbVideos>(`/movie/${tmdbId}/videos`, {
      language,
    });
  }

  async getPopularMovies(page: number): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.get<TmdbPaginatedResponse<TmdbMovie>>('/movie/popular', { page });
  }

  async getNowPlayingMovies(page: number): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.get<TmdbPaginatedResponse<TmdbMovie>>('/movie/now_playing', { page });
  }

  async getUpcomingMovies(page: number): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.get<TmdbPaginatedResponse<TmdbMovie>>('/movie/upcoming', { page });
  }

  async getTopRatedMovies(page: number): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.get<TmdbPaginatedResponse<TmdbMovie>>('/movie/top_rated', { page });
  }

  async searchMovies(
    query: string,
    page: number,
  ): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    return this.get<TmdbPaginatedResponse<TmdbMovie>>('/search/movie', { query, page });
  }

  async getMovieChanges(
    startDate: string,
    endDate: string,
    page: number,
  ): Promise<TmdbChanges> {
    return this.get<TmdbChanges>('/movie/changes', {
      start_date: startDate,
      end_date: endDate,
      page,
    });
  }

  async getTVChanges(
    startDate: string,
    endDate: string,
    page: number,
  ): Promise<TmdbChanges> {
    return this.get<TmdbChanges>('/tv/changes', {
      start_date: startDate,
      end_date: endDate,
      page,
    });
  }

  async getTVSeries(
    tmdbId: number,
    appendToResponse?: string,
  ): Promise<TmdbTVDetail> {
    return this.get<TmdbTVDetail>(`/tv/${tmdbId}`, {
      append_to_response: appendToResponse,
    });
  }

  async getTVSeriesVideos(
    tmdbId: number,
    language = 'en-US',
    includeVideoLanguage = 'en-US,en,null',
  ): Promise<TmdbVideos> {
    return this.get<TmdbVideos>(`/tv/${tmdbId}/videos`, {
      include_video_language: includeVideoLanguage,
      language,
    });
  }

  async getPopularTV(page: number): Promise<TmdbPaginatedResponse<TmdbTVSeries>> {
    return this.get<TmdbPaginatedResponse<TmdbTVSeries>>('/tv/popular', { page });
  }

  async getTVSeason(
    seriesId: number,
    seasonNumber: number,
  ): Promise<TmdbSeasonDetail> {
    return this.get<TmdbSeasonDetail>(`/tv/${seriesId}/season/${seasonNumber}`);
  }

  async searchTV(
    query: string,
    page: number,
  ): Promise<TmdbPaginatedResponse<TmdbTVSeries>> {
    return this.get<TmdbPaginatedResponse<TmdbTVSeries>>('/search/tv', { query, page });
  }

  async getPerson(
    tmdbId: number,
    appendToResponse?: string,
  ): Promise<TmdbPersonDetail> {
    return this.get<TmdbPersonDetail>(`/person/${tmdbId}`, {
      append_to_response: appendToResponse,
    });
  }

  async searchPeople(
    query: string,
    page: number,
  ): Promise<TmdbPaginatedResponse<TmdbPerson>> {
    return this.get<TmdbPaginatedResponse<TmdbPerson>>('/search/person', { query, page });
  }

  async getMovieGenres(): Promise<TmdbGenre[]> {
    const response = await this.get<TmdbGenresResponse>('/genre/movie/list');

    return response.genres;
  }

  async getTVGenres(): Promise<TmdbGenre[]> {
    const response = await this.get<TmdbGenresResponse>('/genre/tv/list');

    return response.genres;
  }

  async getTrending(
    mediaType: TmdbMediaType,
    timeWindow: TmdbTimeWindow,
  ): Promise<TmdbPaginatedResponse> {
    return this.get<TmdbPaginatedResponse>(`/trending/${mediaType}/${timeWindow}`);
  }

  getImageUrl(path: string | null, size: TmdbImageSize): string | null {
    if (!path) {
      return null;
    }

    const normalizedBaseUrl = this.imageBaseUrl.endsWith('/')
      ? this.imageBaseUrl
      : `${this.imageBaseUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    return `${normalizedBaseUrl}${size}/${normalizedPath}`;
  }

  private async get<T>(endpoint: string, params: TmdbRequestParams = {}): Promise<T> {
    const normalizedParams = this.normalizeParams(params);
    const cacheKey = this.buildCacheKey(endpoint, normalizedParams);
    const cached = await this.redisService.get<T>(cacheKey);

    if (cached) {
      return cached;
    }

    const data = await this.limiter.schedule(() =>
      this.requestWithRetry<T>(endpoint, normalizedParams),
    );

    await this.redisService.set(cacheKey, data, this.cacheTtl);

    return data;
  }

  private async requestWithRetry<T>(
    endpoint: string,
    params: TmdbRequestParams,
    attempt = 1,
  ): Promise<T> {
    try {
      const response = await this.httpClient.get<T>(endpoint, { params });

      return response.data;
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        await this.sleep(this.retryBaseDelayMs * 2 ** (attempt - 1));

        return this.requestWithRetry<T>(endpoint, params, attempt + 1);
      }

      throw this.toTmdbException(error);
    }
  }

  private normalizeParams(params: TmdbRequestParams): TmdbRequestParams {
    return Object.keys(params)
      .sort()
      .reduce<TmdbRequestParams>((accumulator, key) => {
        const value = params[key];

        if (value !== undefined && value !== '') {
          accumulator[key] = value;
        }

        return accumulator;
      }, {});
  }

  private buildCacheKey(endpoint: string, params: TmdbRequestParams) {
    const hash = createHash('sha1')
      .update(JSON.stringify({
        endpoint,
        language: this.defaultLanguage,
        params,
      }))
      .digest('hex');

    return `tmdb:${endpoint.replaceAll('/', ':')}:${hash}`;
  }

  private isRetryableError(error: unknown) {
    if (!this.isAxiosError(error)) {
      return false;
    }

    const status = error.response?.status;

    return status === 429 || (status !== undefined && status >= 500);
  }

  private toTmdbException(error: unknown) {
    if (!this.isAxiosError(error)) {
      return new TmdbApiException('Unexpected TMDB client error.');
    }

    const message =
      error.response?.data &&
      typeof error.response.data === 'object' &&
      'status_message' in error.response.data
        ? String(error.response.data.status_message)
        : error.message;

    return new TmdbApiException(`TMDB request failed: ${message}`);
  }

  private isAxiosError(error: unknown): error is AxiosError<{ status_message?: string }> {
    return Boolean(error && typeof error === 'object' && 'isAxiosError' in error);
  }

  private async sleep(delayMs: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}
