import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

import { PrismaService } from '@/prisma/prisma.service';

type RecommendationItem = {
  movie_id: number;
  score: number;
};

type RecommendationServiceResponse = {
  results: RecommendationItem[];
};

const movieSummarySelect = {
  id: true,
  tmdbId: true,
  title: true,
  originalTitle: true,
  overview: true,
  releaseDate: true,
  runtime: true,
  language: true,
  budget: true,
  revenue: true,
  status: true,
  voteAverage: true,
  voteCount: true,
  tmdbVoteAverage: true,
  tmdbVoteCount: true,
  popularity: true,
  posterUrl: true,
  backdropUrl: true,
  genres: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const satisfies Prisma.MovieSelect;

type MovieSummary = Prisma.MovieGetPayload<{ select: typeof movieSummarySelect }>;

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const baseURL = this.configService.get<string>(
      'RECOMMENDATION_URL',
      'http://localhost:5000',
    );
    const timeout = Number(
      this.configService.get<string>('RECOMMENDATION_TIMEOUT_MS', '3000'),
    );

    this.httpClient = axios.create({ baseURL, timeout });
  }

  async getSimilar(movieId: number, limit: number) {
    try {
      const recommendations = await this.fetchRecommendations(
        `/recommend/similar/${movieId}`,
        limit,
      );

      return this.enrich(recommendations, 'hybrid', false);
    } catch (error) {
      this.logger.warn(`Recommendation similar fallback for movie ${movieId}: ${String(error)}`);

      const fallback = await this.getSimilarFallback(movieId, limit);

      return this.enrich(fallback, 'fallback:genre', true);
    }
  }

  async getPersonalized(userId: string, limit: number) {
    try {
      const recommendations = await this.fetchRecommendations(
        `/recommend/personalized/${userId}`,
        limit,
      );

      return this.enrich(recommendations, 'hybrid', false);
    } catch (error) {
      this.logger.warn(`Recommendation personalized fallback for user ${userId}: ${String(error)}`);

      const fallback = await this.getPersonalizedFallback(limit);

      return this.enrich(fallback, 'fallback:popular', true);
    }
  }

  private async fetchRecommendations(path: string, limit: number) {
    const response = await this.httpClient.get<RecommendationServiceResponse>(path, {
      params: { limit },
    });

    return response.data.results.map((item) => ({
      movie_id: Number(item.movie_id),
      score: Number(item.score),
    }));
  }

  private async enrich(
    recommendations: RecommendationItem[],
    source: string,
    fallback: boolean,
  ) {
    if (recommendations.length === 0) {
      return { results: [], fallback };
    }

    const movieIds = recommendations.map((item) => item.movie_id);
    const movies = await this.prismaService.movie.findMany({
      where: {
        id: { in: movieIds },
        isDeleted: false,
      },
      select: movieSummarySelect,
    });
    const movieById = new Map(movies.map((movie) => [movie.id, movie]));

    return {
      results: recommendations.flatMap((item) => {
        const movie = movieById.get(item.movie_id);

        return movie
          ? [{
              movie: this.serializeMovie(movie),
              score: item.score,
              source,
            }]
          : [];
      }),
      fallback,
    };
  }

  private async getSimilarFallback(movieId: number, limit: number): Promise<RecommendationItem[]> {
    const movie = await this.prismaService.movie.findFirst({
      where: { id: movieId, isDeleted: false },
      select: {
        genres: {
          select: { id: true },
        },
      },
    });
    const genreIds = movie?.genres.map((genre) => genre.id) ?? [];

    if (genreIds.length === 0) {
      return this.getPersonalizedFallback(limit);
    }

    const movies = await this.prismaService.movie.findMany({
      where: {
        id: { not: movieId },
        isDeleted: false,
        genres: {
          some: {
            id: { in: genreIds },
          },
        },
      },
      orderBy: [{ popularity: 'desc' }, { tmdbVoteAverage: 'desc' }],
      take: limit,
      select: { id: true, popularity: true },
    });

    return movies.map((item) => ({
      movie_id: item.id,
      score: item.popularity,
    }));
  }

  private async getPersonalizedFallback(limit: number): Promise<RecommendationItem[]> {
    const movies = await this.prismaService.movie.findMany({
      where: { isDeleted: false },
      orderBy: [{ popularity: 'desc' }, { tmdbVoteAverage: 'desc' }],
      take: limit,
      select: { id: true, popularity: true },
    });

    return movies.map((item) => ({
      movie_id: item.id,
      score: item.popularity,
    }));
  }

  private serializeMovie(movie: MovieSummary) {
    return {
      ...movie,
      budget: movie.budget?.toString() ?? null,
      revenue: movie.revenue?.toString() ?? null,
    };
  }
}
