import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import type { AdminGenreQueryDto } from '@/modules/genres/dto/admin-genre-query.dto';
import type { CreateGenreDto } from '@/modules/genres/dto/create-genre.dto';
import type { UpdateGenreDto } from '@/modules/genres/dto/update-genre.dto';
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

type AdminGenreWithCount = {
  id: number;
  tmdbId: number | null;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    movies: number;
    tvSeries: number;
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

  async getAdminGenres(query: AdminGenreQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where = this.buildAdminGenreWhere(query.q);

    const [total, genres] = await this.prismaService.$transaction([
      this.prismaService.genre.count({ where }),
      this.prismaService.genre.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
        select: this.adminGenreSelect(),
      }),
    ]);

    return {
      data: genres.map((genre) => this.mapAdminGenre(genre)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createGenre(dto: CreateGenreDto) {
    const name = dto.name.trim();
    const slug = dto.slug?.trim() || this.slugify(name);

    try {
      const genre = await this.prismaService.genre.create({
        data: {
          name,
          slug,
          tmdbId: dto.tmdbId ?? null,
        },
        select: this.adminGenreSelect(),
      });

      await this.invalidateGenreCaches();

      return this.mapAdminGenre(genre);
    } catch (error) {
      this.throwConflictForUniqueGenre(error);
      throw error;
    }
  }

  async updateGenre(id: number, dto: UpdateGenreDto) {
    const existing = await this.prismaService.genre.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Genre not found.', 'Not Found');
    }

    try {
      const genre = await this.prismaService.genre.update({
        where: { id },
        data: this.buildUpdatePayload(dto),
        select: this.adminGenreSelect(),
      });

      await this.invalidateGenreCaches();

      return this.mapAdminGenre(genre);
    } catch (error) {
      this.throwConflictForUniqueGenre(error);
      throw error;
    }
  }

  async deleteGenre(id: number): Promise<MessageResponseEntity> {
    const existing = await this.prismaService.genre.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            movies: true,
            tvSeries: true,
          },
        },
      },
    });

    if (!existing) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Genre not found.', 'Not Found');
    }

    if (existing._count.movies > 0 || existing._count.tvSeries > 0) {
      throw this.createHttpException(
        HttpStatus.CONFLICT,
        'Genre is in use and cannot be deleted.',
        'Conflict',
      );
    }

    await this.prismaService.genre.delete({
      where: { id },
    });
    await this.invalidateGenreCaches();

    return {
      message: 'Genre deleted successfully',
    };
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

  private mapAdminGenre(genre: AdminGenreWithCount) {
    return {
      id: genre.id,
      tmdbId: genre.tmdbId,
      name: genre.name,
      slug: genre.slug,
      movieCount: genre._count.movies,
      tvCount: genre._count.tvSeries,
      createdAt: genre.createdAt,
      updatedAt: genre.updatedAt,
    };
  }

  private adminGenreSelect() {
    return {
      id: true,
      tmdbId: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          movies: true,
          tvSeries: true,
        },
      },
    } satisfies Prisma.GenreSelect;
  }

  private buildAdminGenreWhere(search?: string): Prisma.GenreWhereInput {
    const q = search?.trim();

    if (!q) {
      return {};
    }

    return {
      OR: [
        {
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ],
    };
  }

  private buildUpdatePayload(dto: UpdateGenreDto): Prisma.GenreUpdateInput {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
      ...(dto.tmdbId !== undefined ? { tmdbId: dto.tmdbId ?? null } : {}),
    };
  }

  private slugify(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'genre'
    );
  }

  private async invalidateGenreCaches() {
    await Promise.all([
      this.redisService.del('genres:movie'),
      this.redisService.del('genres:tv'),
    ]);
  }

  private throwConflictForUniqueGenre(error: unknown): never | void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw this.createHttpException(
        HttpStatus.CONFLICT,
        'Genre slug or TMDB ID already exists.',
        'Conflict',
      );
    }
  }

  private createHttpException(statusCode: HttpStatus, message: string, error: string) {
    return new HttpException(
      {
        statusCode,
        message,
        error,
      },
      statusCode,
    );
  }
}
