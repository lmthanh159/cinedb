import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MessageResponseEntity } from '@/modules/auth/entities/auth-response.entity';
import { SearchSyncService } from '@/modules/search/search-sync.service';
import type { CreateEpisodeDto } from '@/modules/tv-series/dto/create-episode.dto';
import type { CreateSeasonDto } from '@/modules/tv-series/dto/create-season.dto';
import type { CreateTvSeriesDto } from '@/modules/tv-series/dto/create-tv-series.dto';
import type { TvReviewsQueryDto } from '@/modules/tv-series/dto/tv-reviews-query.dto';
import {
  TvSeriesCategory,
  TvSeriesQueryDto,
  TvSeriesSortBy,
  TvSortOrder,
} from '@/modules/tv-series/dto/tv-series-query.dto';
import type { UpdateEpisodeDto } from '@/modules/tv-series/dto/update-episode.dto';
import type { UpdateSeasonDto } from '@/modules/tv-series/dto/update-season.dto';
import type { UpdateTvSeriesDto } from '@/modules/tv-series/dto/update-tv-series.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type SerializableTvSeries = {
  id: number;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  firstAirDate: Date | null;
  lastAirDate: Date | null;
  status: string | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
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
export class TvSeriesService {
  private readonly logger = new Logger(TvSeriesService.name);
  private readonly listCacheTtl = 600;
  private readonly detailCacheTtl = 3600;
  private readonly similarCacheTtl = 3600;
  private readonly seasonCacheTtl = 3600;
  private readonly episodeCacheTtl = 3600;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    @Optional() private readonly searchSyncService?: SearchSyncService,
  ) {}

  async getTvSeries(query: TvSeriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cacheKey = this.buildListCacheKey(query);
    const cached = await this.redisService.get<{
      data: SerializableTvSeries[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const where = this.buildSeriesWhere(query.category);
    const orderBy = this.buildSeriesOrderBy(query);
    const skip = (page - 1) * limit;

    const [total, series] = await this.prismaService.$transaction([
      this.prismaService.tVSeries.count({ where }),
      this.prismaService.tVSeries.findMany({
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
          firstAirDate: true,
          lastAirDate: true,
          status: true,
          numberOfSeasons: true,
          numberOfEpisodes: true,
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
      data: series.map((item) => this.serializeTvSeries(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    await this.redisService.set(cacheKey, response, this.listCacheTtl);

    return response;
  }

  async getTvSeriesById(id: number) {
    const cacheKey = `tv:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const series = await this.findActiveSeriesWithDetails(id);

    if (!series) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    const response = this.serializeSeriesDetail(series);

    await this.redisService.set(cacheKey, response, this.detailCacheTtl);

    return response;
  }

  async getTvSeriesCredits(id: number) {
    const series = await this.prismaService.tVSeries.findFirst({
      where: { id, isDeleted: false },
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

    if (!series) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    return {
      cast: series.cast.map((castMember) => ({
        person: castMember.person,
        character: castMember.character,
        displayOrder: castMember.displayOrder,
      })),
      crew: series.crew.map((crewMember) => ({
        person: crewMember.person,
        job: crewMember.job,
        department: crewMember.department,
      })),
    };
  }

  async getTvSeriesVideos(id: number) {
    const series = await this.prismaService.tVSeries.findFirst({
      where: { id, isDeleted: false },
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

    if (!series) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    return {
      results: series.trailers,
    };
  }

  async getSimilarTvSeries(id: number) {
    const cacheKey = `tv:${id}:similar`;
    const cached = await this.redisService.get<{ data: SerializableTvSeries[] }>(cacheKey);

    if (cached) {
      return cached;
    }

    const series = await this.prismaService.tVSeries.findFirst({
      where: { id, isDeleted: false },
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

    if (!series) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    const genreIds = series.genres.map((genre) => genre.id);
    const directorIds = series.crew.map((crewMember) => crewMember.personId);

    if (genreIds.length === 0 && directorIds.length === 0) {
      return { data: [] };
    }

    const candidates = await this.prismaService.tVSeries.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
        OR: [
          genreIds.length > 0
            ? {
                genres: {
                  some: {
                    id: { in: genreIds },
                  },
                },
              }
            : undefined,
          directorIds.length > 0
            ? {
                crew: {
                  some: {
                    personId: { in: directorIds },
                    OR: [
                      { job: { equals: 'Director', mode: 'insensitive' } },
                      { department: { equals: 'Directing', mode: 'insensitive' } },
                    ],
                  },
                },
              }
            : undefined,
        ].filter(Boolean) as Prisma.TVSeriesWhereInput[],
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

    const similarSeries = candidates
      .filter((candidate) => {
        const overlap = candidate.genres.filter((genre) => genreIds.includes(genre.id)).length;
        const sameDirector = candidate.crew.some((crewMember) =>
          directorIds.includes(crewMember.personId),
        );

        return overlap >= 2 || sameDirector;
      })
      .slice(0, 12)
      .map((candidate) => this.serializeTvSeries(candidate));

    const response = {
      data: similarSeries,
    };

    await this.redisService.set(cacheKey, response, this.similarCacheTtl);

    return response;
  }

  async getTvSeriesReviews(id: number, query: TvReviewsQueryDto) {
    await this.ensureSeriesExists(id);

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
          seriesId: id,
        },
      }),
      this.prismaService.rating.findMany({
        where: {
          seriesId: id,
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
        seriesId: id,
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

  async getSeason(seriesId: number, seasonNumber: number) {
    const cacheKey = `tv:${seriesId}:season:${seasonNumber}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const season = await this.findSeason(seriesId, seasonNumber);

    if (!season) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Season not found.', 'Not Found');
    }

    const response = {
      seasonNumber: season.seasonNumber,
      name: season.name,
      overview: season.overview,
      airDate: season.airDate,
      posterUrl: season.posterUrl,
      episodeCount: season.episodeCount,
      episodes: season.episodes.map((episode) => ({
        episodeNumber: episode.episodeNumber,
        name: episode.name,
        overview: episode.overview,
        airDate: episode.airDate,
        runtime: episode.runtime,
        stillUrl: episode.stillUrl,
        voteAverage: episode.voteAverage,
        voteCount: episode.voteCount,
      })),
    };

    await this.redisService.set(cacheKey, response, this.seasonCacheTtl);

    return response;
  }

  async getEpisode(seriesId: number, seasonNumber: number, episodeNumber: number) {
    const cacheKey = `tv:${seriesId}:season:${seasonNumber}:episode:${episodeNumber}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const episode = await this.findEpisode(seriesId, seasonNumber, episodeNumber);

    if (!episode) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Episode not found.', 'Not Found');
    }

    const response = {
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      overview: episode.overview,
      airDate: episode.airDate,
      runtime: episode.runtime,
      stillUrl: episode.stillUrl,
      voteAverage: episode.voteAverage,
      voteCount: episode.voteCount,
    };

    await this.redisService.set(cacheKey, response, this.episodeCacheTtl);

    return response;
  }

  async createTvSeries(dto: CreateTvSeriesDto) {
    await this.ensureRelatedEntitiesExist(dto.genreIds, dto.countryIds, dto.companyIds);

    const series = await this.prismaService.tVSeries.create({
      data: this.buildCreatePayload(dto),
    });

    await this.invalidateSeriesCaches(series.id);
    await this.syncSeriesSearch(series.id);

    return this.getTvSeriesById(series.id);
  }

  async updateTvSeries(id: number, dto: UpdateTvSeriesDto) {
    const existing = await this.prismaService.tVSeries.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    await this.ensureRelatedEntitiesExist(dto.genreIds, dto.countryIds, dto.companyIds);

    const relationData = this.buildRelationUpdatePayload(dto);
    const scalarData = this.buildScalarUpdatePayload(dto);
    const adminEditedFields = Object.keys(dto).filter(
      (field) => dto[field as keyof UpdateTvSeriesDto] !== undefined,
    );

    await this.prismaService.tVSeries.update({
      where: { id },
      data: {
        ...scalarData,
        ...relationData,
        ...(existing.tmdbId
          ? {
              isAdminEdited: true,
              adminEditedFields,
            }
          : {}),
      },
    });

    await this.invalidateSeriesCaches(id);
    await this.syncSeriesSearch(id);

    return this.getTvSeriesById(id);
  }

  async deleteTvSeries(id: number): Promise<MessageResponseEntity> {
    const existing = await this.prismaService.tVSeries.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }

    await this.prismaService.tVSeries.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    await this.invalidateSeriesCaches(id);
    await this.syncSeriesSearch(id, true);

    return {
      message: 'TV series deleted successfully',
    };
  }

  async createSeason(seriesId: number, dto: CreateSeasonDto) {
    await this.ensureSeriesExists(seriesId);

    const season = await this.prismaService.season.create({
      data: {
        series: {
          connect: { id: seriesId },
        },
        seasonNumber: dto.seasonNumber,
        name: dto.name?.trim() || null,
        overview: dto.overview?.trim() || null,
        airDate: dto.airDate ? new Date(dto.airDate) : null,
        posterUrl: dto.posterUrl?.trim() || null,
        episodeCount: dto.episodeCount ?? 0,
      },
    });

    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return this.getSeason(seriesId, season.seasonNumber);
  }

  async updateSeason(seriesId: number, seasonNumber: number, dto: UpdateSeasonDto) {
    const season = await this.ensureSeasonExists(seriesId, seasonNumber);

    await this.prismaService.season.update({
      where: {
        id: season.id,
      },
      data: {
        ...(dto.seasonNumber !== undefined ? { seasonNumber: dto.seasonNumber } : {}),
        ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
        ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
        ...(dto.airDate !== undefined ? { airDate: dto.airDate ? new Date(dto.airDate) : null } : {}),
        ...(dto.posterUrl !== undefined ? { posterUrl: dto.posterUrl?.trim() || null } : {}),
        ...(dto.episodeCount !== undefined ? { episodeCount: dto.episodeCount } : {}),
      },
    });

    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return this.getSeason(seriesId, dto.seasonNumber ?? seasonNumber);
  }

  async deleteSeason(seriesId: number, seasonNumber: number): Promise<MessageResponseEntity> {
    const season = await this.ensureSeasonExists(seriesId, seasonNumber);

    await this.prismaService.season.delete({
      where: { id: season.id },
    });

    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return {
      message: 'Season deleted successfully',
    };
  }

  async createEpisode(seriesId: number, seasonNumber: number, dto: CreateEpisodeDto) {
    const season = await this.ensureSeasonExists(seriesId, seasonNumber);

    const episode = await this.prismaService.episode.create({
      data: {
        season: {
          connect: { id: season.id },
        },
        episodeNumber: dto.episodeNumber,
        name: dto.name?.trim() || null,
        overview: dto.overview?.trim() || null,
        airDate: dto.airDate ? new Date(dto.airDate) : null,
        runtime: dto.runtime ?? null,
        stillUrl: dto.stillUrl?.trim() || null,
        voteAverage: dto.voteAverage ?? 0,
        voteCount: dto.voteCount ?? 0,
      },
    });

    await this.syncSeasonEpisodeCount(season.id);
    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return this.getEpisode(seriesId, seasonNumber, episode.episodeNumber);
  }

  async updateEpisode(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
    dto: UpdateEpisodeDto,
  ) {
    const episode = await this.ensureEpisodeExists(seriesId, seasonNumber, episodeNumber);

    await this.prismaService.episode.update({
      where: { id: episode.id },
      data: {
        ...(dto.episodeNumber !== undefined ? { episodeNumber: dto.episodeNumber } : {}),
        ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
        ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
        ...(dto.airDate !== undefined ? { airDate: dto.airDate ? new Date(dto.airDate) : null } : {}),
        ...(dto.runtime !== undefined ? { runtime: dto.runtime } : {}),
        ...(dto.stillUrl !== undefined ? { stillUrl: dto.stillUrl?.trim() || null } : {}),
        ...(dto.voteAverage !== undefined ? { voteAverage: dto.voteAverage } : {}),
        ...(dto.voteCount !== undefined ? { voteCount: dto.voteCount } : {}),
      },
    });

    await this.syncSeasonEpisodeCount(episode.seasonId);
    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return this.getEpisode(seriesId, seasonNumber, dto.episodeNumber ?? episodeNumber);
  }

  async deleteEpisode(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<MessageResponseEntity> {
    const episode = await this.ensureEpisodeExists(seriesId, seasonNumber, episodeNumber);

    await this.prismaService.episode.delete({
      where: { id: episode.id },
    });

    await this.syncSeasonEpisodeCount(episode.seasonId);
    await this.syncSeriesSeasonStats(seriesId);
    await this.invalidateSeriesCaches(seriesId);

    return {
      message: 'Episode deleted successfully',
    };
  }

  private buildListCacheKey(query: TvSeriesQueryDto) {
    return [
      'tv',
      query.category ?? 'all',
      `page:${query.page ?? 1}`,
      `limit:${query.limit ?? 20}`,
      `sort:${query.sort_by ?? 'default'}`,
      `order:${query.sort_order ?? TvSortOrder.DESC}`,
    ].join(':');
  }

  private buildSeriesWhere(category?: TvSeriesCategory): Prisma.TVSeriesWhereInput {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    switch (category) {
      case TvSeriesCategory.NOW_PLAYING:
        return {
          isDeleted: false,
          firstAirDate: {
            gte: sixtyDaysAgo,
            lte: now,
          },
        };
      case TvSeriesCategory.UPCOMING:
        return {
          isDeleted: false,
          firstAirDate: {
            gt: now,
          },
        };
      case TvSeriesCategory.TOP_RATED:
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

  private buildSeriesOrderBy(query: TvSeriesQueryDto): Prisma.TVSeriesOrderByWithRelationInput {
    if (!query.sort_by) {
      switch (query.category) {
        case TvSeriesCategory.TOP_RATED:
          return { voteAverage: 'desc' };
        case TvSeriesCategory.UPCOMING:
          return { firstAirDate: 'asc' };
        case TvSeriesCategory.NOW_PLAYING:
          return { firstAirDate: 'desc' };
        default:
          return { popularity: 'desc' };
      }
    }

    const order = query.sort_order ?? TvSortOrder.DESC;

    switch (query.sort_by) {
      case TvSeriesSortBy.VOTE_AVERAGE:
        return { voteAverage: order };
      case TvSeriesSortBy.FIRST_AIR_DATE:
        return { firstAirDate: order };
      case TvSeriesSortBy.TITLE:
        return { title: order };
      default:
        return { popularity: order };
    }
  }

  private serializeTvSeries(series: {
    id: number;
    tmdbId: number | null;
    title: string;
    originalTitle: string | null;
    overview: string | null;
    firstAirDate: Date | null;
    lastAirDate: Date | null;
    status: string | null;
    numberOfSeasons: number;
    numberOfEpisodes: number;
    voteAverage: number;
    voteCount: number;
    tmdbVoteAverage: number;
    tmdbVoteCount: number;
    popularity: number;
    posterUrl: string | null;
    backdropUrl: string | null;
    genres: Array<{ id: number; name: string; slug?: string }>;
  }): SerializableTvSeries {
    return {
      id: series.id,
      tmdbId: series.tmdbId,
      title: series.title,
      originalTitle: series.originalTitle,
      overview: series.overview,
      firstAirDate: series.firstAirDate,
      lastAirDate: series.lastAirDate,
      status: series.status,
      numberOfSeasons: series.numberOfSeasons,
      numberOfEpisodes: series.numberOfEpisodes,
      voteAverage: series.voteAverage,
      voteCount: series.voteCount,
      tmdbVoteAverage: series.tmdbVoteAverage,
      tmdbVoteCount: series.tmdbVoteCount,
      popularity: series.popularity,
      posterUrl: series.posterUrl,
      backdropUrl: series.backdropUrl,
      genres: series.genres.map((genre) => ({
        id: genre.id,
        name: genre.name,
        ...(genre.slug ? { slug: genre.slug } : {}),
      })),
    };
  }

  private serializeSeriesDetail(
    series: Awaited<ReturnType<TvSeriesService['findActiveSeriesWithDetails']>>,
  ) {
    if (!series) {
      return null;
    }

    const base = this.serializeTvSeries(series);
    const filteredCrew = series.crew
      .filter((crewMember) => this.isRelevantCrewRole(crewMember.job, crewMember.department))
      .map((crewMember) => ({
        person: crewMember.person,
        job: crewMember.job,
        department: crewMember.department,
      }));

    return {
      ...base,
      seasons: series.seasons.map((season) => ({
        seasonNumber: season.seasonNumber,
        name: season.name,
        episodeCount: season.episodeCount,
        posterUrl: season.posterUrl,
      })),
      cast: series.cast.map((castMember) => ({
        person: castMember.person,
        character: castMember.character,
        displayOrder: castMember.displayOrder,
      })),
      crew: filteredCrew,
      trailers: series.trailers,
      images: series.images,
      stats: {
        voteAverage: series.voteAverage,
        voteCount: series.voteCount,
        tmdbVoteAverage: series.tmdbVoteAverage,
        tmdbVoteCount: series.tmdbVoteCount,
      },
      countries: series.countries,
      companies: series.companies,
    };
  }

  private async findActiveSeriesWithDetails(id: number) {
    return this.prismaService.tVSeries.findFirst({
      where: { id, isDeleted: false },
      include: {
        seasons: {
          orderBy: {
            seasonNumber: 'asc',
          },
          select: {
            seasonNumber: true,
            name: true,
            episodeCount: true,
            posterUrl: true,
          },
        },
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

  private async findSeason(seriesId: number, seasonNumber: number) {
    return this.prismaService.season.findFirst({
      where: {
        seriesId,
        seasonNumber,
        series: {
          isDeleted: false,
        },
      },
      include: {
        episodes: {
          orderBy: {
            episodeNumber: 'asc',
          },
        },
      },
    });
  }

  private async findEpisode(seriesId: number, seasonNumber: number, episodeNumber: number) {
    return this.prismaService.episode.findFirst({
      where: {
        episodeNumber,
        season: {
          seasonNumber,
          seriesId,
          series: {
            isDeleted: false,
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

  private buildCreatePayload(dto: CreateTvSeriesDto): Prisma.TVSeriesCreateInput {
    return {
      title: dto.title.trim(),
      ...(dto.originalTitle !== undefined
        ? { originalTitle: dto.originalTitle?.trim() || null }
        : {}),
      ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
      ...(dto.firstAirDate !== undefined
        ? { firstAirDate: dto.firstAirDate ? new Date(dto.firstAirDate) : null }
        : {}),
      ...(dto.lastAirDate !== undefined
        ? { lastAirDate: dto.lastAirDate ? new Date(dto.lastAirDate) : null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status?.trim() || null } : {}),
      ...(dto.numberOfSeasons !== undefined ? { numberOfSeasons: dto.numberOfSeasons } : {}),
      ...(dto.numberOfEpisodes !== undefined ? { numberOfEpisodes: dto.numberOfEpisodes } : {}),
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

  private buildScalarUpdatePayload(dto: UpdateTvSeriesDto): Prisma.TVSeriesUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.originalTitle !== undefined
        ? { originalTitle: dto.originalTitle?.trim() || null }
        : {}),
      ...(dto.overview !== undefined ? { overview: dto.overview?.trim() || null } : {}),
      ...(dto.firstAirDate !== undefined
        ? { firstAirDate: dto.firstAirDate ? new Date(dto.firstAirDate) : null }
        : {}),
      ...(dto.lastAirDate !== undefined
        ? { lastAirDate: dto.lastAirDate ? new Date(dto.lastAirDate) : null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status?.trim() || null } : {}),
      ...(dto.numberOfSeasons !== undefined ? { numberOfSeasons: dto.numberOfSeasons } : {}),
      ...(dto.numberOfEpisodes !== undefined ? { numberOfEpisodes: dto.numberOfEpisodes } : {}),
    };
  }

  private buildRelationUpdatePayload(dto: UpdateTvSeriesDto): Prisma.TVSeriesUpdateInput {
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
              id: { in: uniqueGenreIds },
            },
          })
        : Promise.resolve(0),
      uniqueCountryIds.length > 0
        ? this.prismaService.country.count({
            where: {
              id: { in: uniqueCountryIds },
            },
          })
        : Promise.resolve(0),
      uniqueCompanyIds.length > 0
        ? this.prismaService.productionCompany.count({
            where: {
              id: { in: uniqueCompanyIds },
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

  private async ensureSeriesExists(seriesId: number) {
    const series = await this.prismaService.tVSeries.findFirst({
      where: {
        id: seriesId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!series) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'TV series not found.', 'Not Found');
    }
  }

  private async ensureSeasonExists(seriesId: number, seasonNumber: number) {
    const season = await this.prismaService.season.findFirst({
      where: {
        seriesId,
        seasonNumber,
        series: {
          isDeleted: false,
        },
      },
    });

    if (!season) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Season not found.', 'Not Found');
    }

    return season;
  }

  private async ensureEpisodeExists(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
  ) {
    const episode = await this.prismaService.episode.findFirst({
      where: {
        episodeNumber,
        season: {
          seasonNumber,
          seriesId,
          series: {
            isDeleted: false,
          },
        },
      },
    });

    if (!episode) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Episode not found.', 'Not Found');
    }

    return episode;
  }

  private async syncSeasonEpisodeCount(seasonId: number) {
    const count = await this.prismaService.episode.count({
      where: {
        seasonId,
      },
    });

    await this.prismaService.season.update({
      where: { id: seasonId },
      data: {
        episodeCount: count,
      },
    });
  }

  private async syncSeriesSeasonStats(seriesId: number) {
    const seasons = await this.prismaService.season.findMany({
      where: {
        seriesId,
      },
      select: {
        id: true,
        episodeCount: true,
      },
    });

    const numberOfSeasons = seasons.length;
    const numberOfEpisodes = seasons.reduce(
      (total, season) => total + season.episodeCount,
      0,
    );

    await this.prismaService.tVSeries.update({
      where: { id: seriesId },
      data: {
        numberOfSeasons,
        numberOfEpisodes,
      },
    });
  }

  private async invalidateSeriesCaches(seriesId: number) {
    await Promise.all([
      this.redisService.del(`tv:${seriesId}`),
      this.redisService.del(`tv:${seriesId}:similar`),
      this.redisService.delPattern(`tv:${seriesId}:season:*`),
      this.redisService.delPattern('tv:*'),
    ]);
  }

  private async syncSeriesSearch(seriesId: number, remove = false) {
    if (!this.searchSyncService) {
      return;
    }

    try {
      if (remove) {
        await this.searchSyncService.removeSeries(seriesId);
        return;
      }

      await this.searchSyncService.syncSeries(seriesId);
    } catch (error) {
      this.logger.warn(`Failed to sync TV series ${seriesId} to search: ${String(error)}`);
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
