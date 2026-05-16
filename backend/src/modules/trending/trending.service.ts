import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  QueryTrendingDto,
  TrendingMediaType,
  TrendingTimeWindow,
} from '@/modules/trending/dto/query-trending.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type TrendingItem = {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: Date | null;
  firstAirDate?: Date | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  recentRatingsCount: number;
  trendingScore: number;
  genres: Array<{ id: number; name: string; slug?: string }>;
};

type PaginatedTrendingResponse = {
  data: TrendingItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type MovieTrendingRecord = {
  id: number;
  title: string;
  releaseDate: Date | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genres: Array<{ id: number; name: string; slug: string }>;
};

type TvTrendingRecord = {
  id: number;
  title: string;
  firstAirDate: Date | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genres: Array<{ id: number; name: string; slug: string }>;
};

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);
  private readonly cacheTtl = 3600;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getTrending(
    mediaType: TrendingMediaType,
    timeWindow: TrendingTimeWindow,
    query: QueryTrendingDto,
  ): Promise<PaginatedTrendingResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cacheKey = this.buildPageCacheKey(mediaType, timeWindow, page, limit);
    const cached = await this.redisService.get<PaginatedTrendingResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const allItems = await this.calculateTrending(mediaType, timeWindow);
    const response = this.paginatedResponse(
      allItems.slice((page - 1) * limit, page * limit),
      page,
      limit,
      allItems.length,
    );

    await this.redisService.set(cacheKey, response, this.cacheTtl);

    return response;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshTrendingCache() {
    const windows = [TrendingTimeWindow.DAY, TrendingTimeWindow.WEEK];

    for (const timeWindow of windows) {
      const [movies, tvSeries] = await Promise.all([
        this.calculateTrending(TrendingMediaType.MOVIE, timeWindow),
        this.calculateTrending(TrendingMediaType.TV, timeWindow),
      ]);
      const all = [...movies, ...tvSeries].sort(
        (left, right) => right.trendingScore - left.trendingScore,
      );

      await Promise.all([
        this.cacheFirstPage(TrendingMediaType.MOVIE, timeWindow, movies),
        this.cacheFirstPage(TrendingMediaType.TV, timeWindow, tvSeries),
        this.cacheFirstPage(TrendingMediaType.ALL, timeWindow, all),
      ]);

      this.logger.log(`Trending refreshed: ${movies.length} movies, ${tvSeries.length} tv`);
    }
  }

  async calculateTrending(
    mediaType: TrendingMediaType,
    timeWindow: TrendingTimeWindow,
  ): Promise<TrendingItem[]> {
    const since = this.getSinceDate(timeWindow);

    if (mediaType === TrendingMediaType.MOVIE) {
      return this.calculateMovieTrending(since);
    }

    if (mediaType === TrendingMediaType.TV) {
      return this.calculateTvTrending(since);
    }

    const [movies, tvSeries] = await Promise.all([
      this.calculateMovieTrending(since),
      this.calculateTvTrending(since),
    ]);

    return [...movies, ...tvSeries].sort(
      (left, right) => right.trendingScore - left.trendingScore,
    );
  }

  private async calculateMovieTrending(since: Date): Promise<TrendingItem[]> {
    const [movies, ratingGroups] = await Promise.all([
      this.prismaService.movie.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          title: true,
          releaseDate: true,
          posterUrl: true,
          backdropUrl: true,
          voteAverage: true,
          voteCount: true,
          popularity: true,
          genres: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prismaService.rating.groupBy({
        by: ['movieId'],
        where: {
          createdAt: {
            gte: since,
          },
          movieId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);
    const ratingCountByMovieId = new Map<number, number>(
      ratingGroups
        .filter((group): group is typeof group & { movieId: number } => group.movieId !== null)
        .map((group) => [group.movieId, group._count._all]),
    );

    return movies
      .map((movie) => this.mapMovieTrending(movie, ratingCountByMovieId.get(movie.id) ?? 0))
      .sort((left, right) => right.trendingScore - left.trendingScore);
  }

  private async calculateTvTrending(since: Date): Promise<TrendingItem[]> {
    const [series, ratingGroups] = await Promise.all([
      this.prismaService.tVSeries.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          title: true,
          firstAirDate: true,
          posterUrl: true,
          backdropUrl: true,
          voteAverage: true,
          voteCount: true,
          popularity: true,
          genres: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prismaService.rating.groupBy({
        by: ['seriesId'],
        where: {
          createdAt: {
            gte: since,
          },
          seriesId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);
    const ratingCountBySeriesId = new Map<number, number>(
      ratingGroups
        .filter((group): group is typeof group & { seriesId: number } => group.seriesId !== null)
        .map((group) => [group.seriesId, group._count._all]),
    );

    return series
      .map((item) => this.mapTvTrending(item, ratingCountBySeriesId.get(item.id) ?? 0))
      .sort((left, right) => right.trendingScore - left.trendingScore);
  }

  private mapMovieTrending(
    movie: MovieTrendingRecord,
    recentRatingsCount: number,
  ): TrendingItem {
    return {
      id: movie.id,
      title: movie.title,
      mediaType: 'movie',
      releaseDate: movie.releaseDate,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      popularity: movie.popularity,
      recentRatingsCount,
      trendingScore: this.calculateScore(movie.popularity, movie.voteCount, recentRatingsCount),
      genres: movie.genres,
    };
  }

  private mapTvTrending(series: TvTrendingRecord, recentRatingsCount: number): TrendingItem {
    return {
      id: series.id,
      title: series.title,
      mediaType: 'tv',
      firstAirDate: series.firstAirDate,
      posterUrl: series.posterUrl,
      backdropUrl: series.backdropUrl,
      voteAverage: series.voteAverage,
      voteCount: series.voteCount,
      popularity: series.popularity,
      recentRatingsCount,
      trendingScore: this.calculateScore(series.popularity, series.voteCount, recentRatingsCount),
      genres: series.genres,
    };
  }

  private calculateScore(popularity: number, voteCount: number, recentRatingsCount: number) {
    return popularity * 0.5 + voteCount * 0.3 + recentRatingsCount * 0.2;
  }

  private getSinceDate(timeWindow: TrendingTimeWindow) {
    const now = new Date();
    const days = timeWindow === TrendingTimeWindow.DAY ? 1 : 7;

    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private async cacheFirstPage(
    mediaType: TrendingMediaType,
    timeWindow: TrendingTimeWindow,
    items: TrendingItem[],
  ) {
    const page = 1;
    const limit = 20;
    const response = this.paginatedResponse(items.slice(0, limit), page, limit, items.length);

    await this.redisService.set(
      this.buildPageCacheKey(mediaType, timeWindow, page, limit),
      response,
      this.cacheTtl,
    );
  }

  private buildPageCacheKey(
    mediaType: TrendingMediaType,
    timeWindow: TrendingTimeWindow,
    page: number,
    limit: number,
  ) {
    return `trending:${mediaType}:${timeWindow}:${page}:limit:${limit}`;
  }

  private paginatedResponse(
    data: TrendingItem[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedTrendingResponse {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
