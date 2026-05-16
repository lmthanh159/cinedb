import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type GenreResponse = {
  data: Array<{
    id: number;
    tmdbId: number | null;
    name: string;
    slug: string;
    count: number;
  }>;
};

type GenreWithCount = {
  id: number;
  tmdbId: number | null;
  name: string;
  slug: string;
  _count: {
    movies?: number;
    tvSeries?: number;
  };
};

@Injectable()
export class GenresService {
  private readonly cacheTtl = 24 * 60 * 60;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getMovieGenres(): Promise<GenreResponse> {
    const cacheKey = 'genres:movie';
    const cached = await this.redisService.get<GenreResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const genres = await this.prismaService.genre.findMany({
      where: {
        movies: {
          some: {
            isDeleted: false,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        slug: true,
        _count: {
          select: {
            movies: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
    });
    const response = {
      data: genres.map((genre) => this.mapMovieGenre(genre)),
    };

    await this.redisService.set(cacheKey, response, this.cacheTtl);

    return response;
  }

  async getTvGenres(): Promise<GenreResponse> {
    const cacheKey = 'genres:tv';
    const cached = await this.redisService.get<GenreResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const genres = await this.prismaService.genre.findMany({
      where: {
        tvSeries: {
          some: {
            isDeleted: false,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        slug: true,
        _count: {
          select: {
            tvSeries: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
    });
    const response = {
      data: genres.map((genre) => this.mapTvGenre(genre)),
    };

    await this.redisService.set(cacheKey, response, this.cacheTtl);

    return response;
  }

  private mapMovieGenre(genre: GenreWithCount) {
    return {
      id: genre.id,
      tmdbId: genre.tmdbId,
      name: genre.name,
      slug: genre.slug,
      count: genre._count.movies ?? 0,
    };
  }

  private mapTvGenre(genre: GenreWithCount) {
    return {
      id: genre.id,
      tmdbId: genre.tmdbId,
      name: genre.name,
      slug: genre.slug,
      count: genre._count.tvSeries ?? 0,
    };
  }
}
