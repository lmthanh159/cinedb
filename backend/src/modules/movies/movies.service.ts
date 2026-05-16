import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import type { CreateMovieDto } from '@/modules/movies/dto/create-movie.dto';
import {
  MovieCategory,
  MovieQueryDto,
  MovieSortBy,
  SortOrder,
} from '@/modules/movies/dto/movie-query.dto';
import type { MovieReviewsQueryDto } from '@/modules/movies/dto/movie-reviews-query.dto';
import type { UpdateMovieDto } from '@/modules/movies/dto/update-movie.dto';
import { SearchSyncService } from '@/modules/search/search-sync.service';
import { TmdbSyncService } from '@/modules/tmdb/tmdb-sync.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type SerializableMovie = {
  id: number;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: Date | null;
  runtime: number | null;
  language: string | null;
  budget: string | null;
  revenue: string | null;
  status: string | null;
  voteAverage: number;
  voteCount: number;
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
  popularity: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Array<{ id: number; name: string; slug?: string }>;
};

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);
  private readonly movieListCacheTtl = 600;
  private readonly movieDetailCacheTtl = 3600;
  private readonly movieSimilarCacheTtl = 3600;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    @Optional() private readonly searchSyncService?: SearchSyncService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly tmdbSyncService?: TmdbSyncService,
  ) {}

  async getMovies(query: MovieQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cacheKey = this.buildMoviesCacheKey(query);
    const cached = await this.redisService.get<{
      data: SerializableMovie[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const where = this.buildMovieWhere(query.category);
    const orderBy = this.buildMovieOrderBy(query);
    const skip = (page - 1) * limit;

    const [total, movies] = await this.prismaService.$transaction([
      this.prismaService.movie.count({ where }),
      this.prismaService.movie.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
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
        },
      }),
    ]);

    const response = {
      data: movies.map((movie) => this.serializeMovie(movie)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    await this.redisService.set(cacheKey, response, this.movieListCacheTtl);

    return response;
  }

  async getMovieById(id: number): Promise<unknown> {
    const cacheKey = `movie:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const movie = await this.findActiveMovieWithDetails(id);

    if (!movie) {
      const importedMovie = await this.tryImportMovieOnDemand(id);

      if (importedMovie) {
        return this.getMovieById(importedMovie.id);
      }

      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    const response = this.serializeMovieDetail(movie);

    await this.redisService.set(cacheKey, response, this.movieDetailCacheTtl);

    return response;
  }

  async getMovieCredits(id: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                profileUrl: true,
              },
            },
          },
        },
        crew: {
          orderBy: [{ department: 'asc' }, { job: 'asc' }],
          include: {
            person: {
              select: {
                id: true,
                name: true,
                profileUrl: true,
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    return {
      cast: movie.cast.map((castMember) => ({
        person: castMember.person,
        character: castMember.character,
        displayOrder: castMember.displayOrder,
      })),
      crew: movie.crew.map((crewMember) => ({
        person: crewMember.person,
        job: crewMember.job,
        department: crewMember.department,
      })),
    };
  }

  async getMovieImages(id: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        posterUrl: true,
        backdropUrl: true,
        images: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            filePath: true,
            type: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!movie) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    return this.partitionMovieImages(movie.images, movie.posterUrl, movie.backdropUrl);
  }

  async getMovieVideos(id: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        trailers: {
          orderBy: [{ official: 'desc' }, { publishedAt: 'desc' }],
          select: {
            id: true,
            name: true,
            key: true,
            site: true,
            type: true,
            official: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!movie) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    return {
      results: movie.trailers,
    };
  }

  async getSimilarMovies(id: number) {
    const cacheKey = `movie:${id}:similar`;
    const cached = await this.redisService.get<{ data: SerializableMovie[] }>(cacheKey);

    if (cached) {
      return cached;
    }

    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        genres: {
          select: {
            id: true,
          },
        },
        crew: {
          where: {
            OR: [
              { job: { equals: 'Director', mode: 'insensitive' } },
              { department: { equals: 'Directing', mode: 'insensitive' } },
            ],
          },
          select: {
            personId: true,
          },
        },
      },
    });

    if (!movie) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    const genreIds = movie.genres.map((genre) => genre.id);
    const directorIds = movie.crew.map((crewMember) => crewMember.personId);

    if (genreIds.length === 0 && directorIds.length === 0) {
      return { data: [] };
    }

    const candidates = await this.prismaService.movie.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
        OR: [
          genreIds.length > 0
            ? {
                genres: {
                  some: {
                    id: {
                      in: genreIds,
                    },
                  },
                },
              }
            : undefined,
          directorIds.length > 0
            ? {
                crew: {
                  some: {
                    personId: {
                      in: directorIds,
                    },
                    OR: [
                      { job: { equals: 'Director', mode: 'insensitive' } },
                      { department: { equals: 'Directing', mode: 'insensitive' } },
                    ],
                  },
                },
              }
            : undefined,
        ].filter(Boolean) as Prisma.MovieWhereInput[],
      },
      orderBy: {
        popularity: 'desc',
      },
      include: {
        genres: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        crew: {
          where: {
            OR: [
              { job: { equals: 'Director', mode: 'insensitive' } },
              { department: { equals: 'Directing', mode: 'insensitive' } },
            ],
          },
          select: {
            personId: true,
          },
        },
      },
      take: 48,
    });

    const similarMovies = candidates
      .filter((candidate) => {
        const overlap = candidate.genres.filter((genre) => genreIds.includes(genre.id)).length;
        const sameDirector = candidate.crew.some((crewMember) =>
          directorIds.includes(crewMember.personId),
        );

        return overlap >= 2 || sameDirector;
      })
      .slice(0, 12)
      .map((movieCandidate) => this.serializeMovie(movieCandidate));

    const response = {
      data: similarMovies,
    };

    await this.redisService.set(cacheKey, response, this.movieSimilarCacheTtl);

    return response;
  }

  async getMovieReviews(id: number, query: MovieReviewsQueryDto) {
    await this.ensureMovieExists(id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const orderBy =
      query.sort_by === 'score'
        ? ({ score: query.sort_order } as Prisma.RatingOrderByWithRelationInput)
        : ({ createdAt: query.sort_order } as Prisma.RatingOrderByWithRelationInput);

    const [total, ratings] = await this.prismaService.$transaction([
      this.prismaService.rating.count({
        where: {
          movieId: id,
        },
      }),
      this.prismaService.rating.findMany({
        where: {
          movieId: id,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const comments = await this.prismaService.comment.findMany({
      where: {
        movieId: id,
        status: 'ACTIVE',
        userId: {
          in: ratings.map((rating) => rating.userId),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        userId: true,
        content: true,
      },
    });

    const latestCommentByUser = new Map<string, string>();

    for (const comment of comments) {
      if (!latestCommentByUser.has(comment.userId)) {
        latestCommentByUser.set(comment.userId, comment.content);
      }
    }

    return {
      data: ratings.map((rating) => ({
        rating: rating.score,
        comment: latestCommentByUser.get(rating.userId) ?? null,
        user: rating.user,
        createdAt: rating.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createMovie(dto: CreateMovieDto) {
    await this.ensureRelatedEntitiesExist(dto.genreIds, dto.countryIds, dto.companyIds);

    const movie = await this.prismaService.movie.create({
      data: this.buildCreatePayload(dto),
    });

    await this.invalidateMovieCaches(movie.id);
    await this.syncMovieSearch(movie.id);

    return this.getMovieById(movie.id);
  }

  async updateMovie(id: number, dto: UpdateMovieDto) {
    const existingMovie = await this.prismaService.movie.findUnique({
      where: { id },
    });

    if (!existingMovie || existingMovie.isDeleted) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    await this.ensureRelatedEntitiesExist(dto.genreIds, dto.countryIds, dto.companyIds);

    const relationData = this.buildRelationUpdatePayload(dto);
    const scalarData = this.buildScalarUpdatePayload(dto);
    const adminEditedFields = Object.keys(dto).filter(
      (field) => dto[field as keyof UpdateMovieDto] !== undefined,
    );

    await this.prismaService.movie.update({
      where: { id },
      data: {
        ...scalarData,
        ...relationData,
        ...(existingMovie.tmdbId
          ? {
              isAdminEdited: true,
              adminEditedFields: adminEditedFields,
            }
          : {}),
      },
    });

    await this.invalidateMovieCaches(id);
    await this.syncMovieSearch(id);

    return this.getMovieById(id);
  }

  async deleteMovie(id: number) {
    const movie = await this.prismaService.movie.findUnique({
      where: { id },
    });

    if (!movie || movie.isDeleted) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }

    await this.prismaService.movie.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    await this.invalidateMovieCaches(id);
    await this.syncMovieSearch(id, true);

    return {
      message: 'Movie deleted successfully',
    };
  }

  private buildMoviesCacheKey(query: MovieQueryDto) {
    return [
      'movies',
      query.category ?? 'all',
      `page:${query.page ?? 1}`,
      `limit:${query.limit ?? 20}`,
      `sort:${query.sort_by ?? 'default'}`,
      `order:${query.sort_order ?? SortOrder.DESC}`,
    ].join(':');
  }

  private buildMovieWhere(category?: MovieCategory): Prisma.MovieWhereInput {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    switch (category) {
      case MovieCategory.NOW_PLAYING:
        return {
          isDeleted: false,
          releaseDate: {
            gte: sixtyDaysAgo,
            lte: now,
          },
        };
      case MovieCategory.UPCOMING:
        return {
          isDeleted: false,
          releaseDate: {
            gt: now,
          },
        };
      case MovieCategory.TOP_RATED:
        return {
          isDeleted: false,
          voteCount: {
            gte: 10,
          },
        };
      default:
        return {
          isDeleted: false,
        };
    }
  }

  private buildMovieOrderBy(query: MovieQueryDto): Prisma.MovieOrderByWithRelationInput {
    if (!query.sort_by) {
      switch (query.category) {
        case MovieCategory.TOP_RATED:
          return { voteAverage: 'desc' };
        case MovieCategory.UPCOMING:
          return { releaseDate: 'asc' };
        case MovieCategory.NOW_PLAYING:
          return { releaseDate: 'desc' };
        default:
          return { popularity: 'desc' };
      }
    }

    const order = query.sort_order ?? SortOrder.DESC;

    switch (query.sort_by) {
      case MovieSortBy.VOTE_AVERAGE:
        return { voteAverage: order };
      case MovieSortBy.RELEASE_DATE:
        return { releaseDate: order };
      case MovieSortBy.TITLE:
        return { title: order };
      default:
        return { popularity: order };
    }
  }

  private serializeMovie(movie: {
    id: number;
    tmdbId: number | null;
    title: string;
    originalTitle: string | null;
    overview: string | null;
    releaseDate: Date | null;
    runtime: number | null;
    language: string | null;
    budget: bigint | null;
    revenue: bigint | null;
    status: string | null;
    voteAverage: number;
    voteCount: number;
    tmdbVoteAverage: number;
    tmdbVoteCount: number;
    popularity: number;
    posterUrl: string | null;
    backdropUrl: string | null;
    genres: Array<{ id: number; name: string; slug?: string }>;
  }): SerializableMovie {
    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: movie.overview,
      releaseDate: movie.releaseDate,
      runtime: movie.runtime,
      language: movie.language,
      budget: this.serializeBigInt(movie.budget),
      revenue: this.serializeBigInt(movie.revenue),
      status: movie.status,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      tmdbVoteAverage: movie.tmdbVoteAverage,
      tmdbVoteCount: movie.tmdbVoteCount,
      popularity: movie.popularity,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      genres: movie.genres.map((genre) => ({
        id: genre.id,
        name: genre.name,
        ...(genre.slug ? { slug: genre.slug } : {}),
      })),
    };
  }

  private serializeMovieDetail(movie: Awaited<ReturnType<MoviesService['findActiveMovieWithDetails']>>) {
    if (!movie) {
      return null;
    }

    const baseMovie = this.serializeMovie(movie);
    const filteredCrew = movie.crew
      .filter((crewMember) => this.isRelevantCrewRole(crewMember.job, crewMember.department))
      .map((crewMember) => ({
        person: crewMember.person,
        job: crewMember.job,
        department: crewMember.department,
      }));
    const images = this.partitionMovieImages(movie.images, movie.posterUrl, movie.backdropUrl);

    return {
      ...baseMovie,
      cast: movie.cast.map((castMember) => ({
        person: castMember.person,
        character: castMember.character,
        displayOrder: castMember.displayOrder,
      })),
      crew: filteredCrew,
      trailers: movie.trailers,
      posters: images.posters,
      backdrops: images.backdrops,
      stats: {
        voteAverage: movie.voteAverage,
        voteCount: movie.voteCount,
        tmdbVoteAverage: movie.tmdbVoteAverage,
        tmdbVoteCount: movie.tmdbVoteCount,
      },
      countries: movie.countries,
      companies: movie.companies,
    };
  }

  private partitionMovieImages(
    images: Array<{
      id: number;
      filePath: string;
      type: string;
      width: number | null;
      height: number | null;
    }>,
    posterUrl?: string | null,
    backdropUrl?: string | null,
  ) {
    const posters = images
      .filter((image) => image.type.toLowerCase().includes('poster'))
      .slice(0, 5);
    const backdrops = images
      .filter((image) => image.type.toLowerCase().includes('backdrop'))
      .slice(0, 5);

    if (posters.length === 0 && posterUrl) {
      posters.push({
        id: 0,
        filePath: posterUrl,
        type: 'poster',
        width: null,
        height: null,
      });
    }

    if (backdrops.length === 0 && backdropUrl) {
      backdrops.push({
        id: 0,
        filePath: backdropUrl,
        type: 'backdrop',
        width: null,
        height: null,
      });
    }

    return {
      posters,
      backdrops,
    };
  }

  private async findActiveMovieWithDetails(id: number) {
    return this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        genres: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          take: 15,
          include: {
            person: {
              select: {
                id: true,
                name: true,
                profileUrl: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                profileUrl: true,
              },
            },
          },
        },
        trailers: {
          orderBy: [{ official: 'desc' }, { publishedAt: 'desc' }],
          select: {
            id: true,
            name: true,
            key: true,
            site: true,
            type: true,
            official: true,
            publishedAt: true,
          },
        },
        images: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            filePath: true,
            type: true,
            width: true,
            height: true,
          },
        },
        countries: {
          select: {
            id: true,
            isoCode: true,
            name: true,
          },
        },
        companies: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            originCountry: true,
          },
        },
      },
    });
  }

  private isRelevantCrewRole(job?: string | null, department?: string | null) {
    const normalizedJob = job?.toLowerCase() ?? '';
    const normalizedDepartment = department?.toLowerCase() ?? '';

    return (
      normalizedJob.includes('director') ||
      normalizedJob.includes('writer') ||
      normalizedJob.includes('screenplay') ||
      normalizedJob.includes('producer') ||
      normalizedDepartment.includes('directing') ||
      normalizedDepartment.includes('writing') ||
      normalizedDepartment.includes('production')
    );
  }

  private serializeBigInt(value: bigint | null) {
    return value === null ? null : value.toString();
  }

  private buildCreatePayload(dto: CreateMovieDto): Prisma.MovieCreateInput {
    return {
      title: dto.title.trim(),
      ...(dto.originalTitle !== undefined
        ? { originalTitle: dto.originalTitle?.trim() || null }
        : {}),
      ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
      ...(dto.releaseDate !== undefined
        ? { releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null }
        : {}),
      ...(dto.runtime !== undefined ? { runtime: dto.runtime } : {}),
      ...(dto.language !== undefined ? { language: dto.language?.trim() || null } : {}),
      ...(dto.budget !== undefined ? { budget: BigInt(dto.budget) } : {}),
      ...(dto.revenue !== undefined ? { revenue: BigInt(dto.revenue) } : {}),
      ...(dto.status !== undefined ? { status: dto.status?.trim() || null } : {}),
      genres: {
        connect: dto.genreIds.map((genreId) => ({ id: genreId })),
      },
      ...(dto.countryIds
        ? {
            countries: {
              connect: dto.countryIds.map((countryId) => ({ id: countryId })),
            },
          }
        : {}),
      ...(dto.companyIds
        ? {
            companies: {
              connect: dto.companyIds.map((companyId) => ({ id: companyId })),
            },
          }
        : {}),
    };
  }

  private buildScalarUpdatePayload(dto: UpdateMovieDto): Prisma.MovieUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.originalTitle !== undefined
        ? { originalTitle: dto.originalTitle?.trim() || null }
        : {}),
      ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
      ...(dto.releaseDate !== undefined
        ? { releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null }
        : {}),
      ...(dto.runtime !== undefined ? { runtime: dto.runtime } : {}),
      ...(dto.language !== undefined ? { language: dto.language?.trim() || null } : {}),
      ...(dto.budget !== undefined ? { budget: BigInt(dto.budget) } : {}),
      ...(dto.revenue !== undefined ? { revenue: BigInt(dto.revenue) } : {}),
      ...(dto.status !== undefined ? { status: dto.status?.trim() || null } : {}),
    };
  }

  private buildRelationUpdatePayload(dto: UpdateMovieDto): Prisma.MovieUpdateInput {
    return {
      ...(dto.genreIds
        ? {
            genres: {
              set: [],
              connect: dto.genreIds.map((genreId) => ({ id: genreId })),
            },
          }
        : {}),
      ...(dto.countryIds
        ? {
            countries: {
              set: [],
              connect: dto.countryIds.map((countryId) => ({ id: countryId })),
            },
          }
        : {}),
      ...(dto.companyIds
        ? {
            companies: {
              set: [],
              connect: dto.companyIds.map((companyId) => ({ id: companyId })),
            },
          }
        : {}),
    };
  }

  private async ensureMovieExists(id: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!movie) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Movie not found.', 'Not Found');
    }
  }

  private async ensureRelatedEntitiesExist(
    genreIds?: number[],
    countryIds?: number[],
    companyIds?: number[],
  ) {
    const uniqueGenreIds = this.uniqueIds(genreIds);
    const uniqueCountryIds = this.uniqueIds(countryIds);
    const uniqueCompanyIds = this.uniqueIds(companyIds);

    const [genreCount, countryCount, companyCount] = await Promise.all([
      uniqueGenreIds.length > 0
        ? this.prismaService.genre.count({
            where: {
              id: {
                in: uniqueGenreIds,
              },
            },
          })
        : Promise.resolve(0),
      uniqueCountryIds.length > 0
        ? this.prismaService.country.count({
            where: {
              id: {
                in: uniqueCountryIds,
              },
            },
          })
        : Promise.resolve(0),
      uniqueCompanyIds.length > 0
        ? this.prismaService.productionCompany.count({
            where: {
              id: {
                in: uniqueCompanyIds,
              },
            },
          })
        : Promise.resolve(0),
    ]);

    if (uniqueGenreIds.length > 0 && genreCount !== uniqueGenreIds.length) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'One or more genres do not exist.',
        'Bad Request',
      );
    }

    if (uniqueCountryIds.length > 0 && countryCount !== uniqueCountryIds.length) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'One or more countries do not exist.',
        'Bad Request',
      );
    }

    if (uniqueCompanyIds.length > 0 && companyCount !== uniqueCompanyIds.length) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'One or more companies do not exist.',
        'Bad Request',
      );
    }
  }

  private uniqueIds(ids?: number[]) {
    return ids ? [...new Set(ids)] : [];
  }

  private async invalidateMovieCaches(id: number) {
    await Promise.all([
      this.redisService.del(`movie:${id}`),
      this.redisService.del(`movie:${id}:similar`),
      this.redisService.delPattern('movies:*'),
    ]);
  }

  private async syncMovieSearch(id: number, remove = false) {
    if (!this.searchSyncService) {
      return;
    }

    try {
      if (remove) {
        await this.searchSyncService.removeMovie(id);
        return;
      }

      await this.searchSyncService.syncMovie(id);
    } catch (error) {
      this.logger.warn(`Failed to sync movie ${id} to search: ${String(error)}`);
    }
  }

  private async tryImportMovieOnDemand(id: number) {
    const isEnabled = this.configService?.get<string>('TMDB_ENABLE_ON_DEMAND_FETCH') === 'true';

    if (!isEnabled || !this.tmdbSyncService) {
      return null;
    }

    try {
      return await this.tmdbSyncService.importSingleMovie(id);
    } catch (error) {
      this.logger.warn(`On-demand TMDB movie import failed for ${id}: ${String(error)}`);
      return null;
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
