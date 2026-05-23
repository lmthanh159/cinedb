import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { SearchSyncService } from '@/modules/search/search-sync.service';
import { FullImportDto } from '@/modules/tmdb/dto/full-import.dto';
import { SyncLogsQueryDto } from '@/modules/tmdb/dto/sync-logs-query.dto';
import { TmdbVideos } from '@/modules/tmdb/interfaces/tmdb.interface';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';
import {
  MappedMovie,
  MappedTvSeries,
  TmdbMapperService,
} from '@/modules/tmdb/tmdb-mapper.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type SyncStats = {
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
};

type ImportError = {
  entityType: string;
  tmdbId: number;
  message: string;
};

@Injectable()
export class TmdbSyncService {
  private readonly logger = new Logger(TmdbSyncService.name);

  constructor(
    private readonly tmdbClientService: TmdbClientService,
    private readonly tmdbMapperService: TmdbMapperService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly searchSyncService: SearchSyncService,
  ) {}

  async fullImport(options: FullImportDto) {
    const movieLog = await this.startSyncLog('FULL_IMPORT', 'MOVIE');
    const tvLog = await this.startSyncLog('FULL_IMPORT', 'TV');
    const movieStats = this.emptyStats();
    const tvStats = this.emptyStats();
    const movieErrors: ImportError[] = [];
    const tvErrors: ImportError[] = [];

    try {
      for (let page = 1; page <= options.moviePages; page += 1) {
        const response = await this.tmdbClientService.getPopularMovies(page);

        for (const movie of response.results) {
          await this.importMovieForBatch(movie.id, movieStats, movieErrors);
        }

        this.logger.log(`Imported movie page ${page}/${options.moviePages}`);
      }

      for (let page = 1; page <= options.tvPages; page += 1) {
        const response = await this.tmdbClientService.getPopularTV(page);

        for (const series of response.results) {
          await this.importSeriesForBatch(series.id, tvStats, tvErrors);
        }

        this.logger.log(`Imported TV page ${page}/${options.tvPages}`);
      }

      await Promise.all([
        this.finishSyncLog(movieLog.id, movieStats, movieErrors),
        this.finishSyncLog(tvLog.id, tvStats, tvErrors),
      ]);
      await this.safeSyncAllSearch();

      return {
        movies: movieStats,
        tvSeries: tvStats,
      };
    } catch (error) {
      await Promise.allSettled([
        this.failSyncLog(movieLog.id, movieStats, movieErrors, 'MOVIE', error),
        this.failSyncLog(tvLog.id, tvStats, tvErrors, 'TV', error),
      ]);
      throw error;
    }
  }

  async dailySync() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const movieLog = await this.startSyncLog('DAILY_SYNC', 'MOVIE');
    const tvLog = await this.startSyncLog('DAILY_SYNC', 'TV');
    const movieStats = this.emptyStats();
    const tvStats = this.emptyStats();
    const movieErrors: ImportError[] = [];
    const tvErrors: ImportError[] = [];

    await this.syncMovieChanges(yesterday, today, movieStats, movieErrors);
    await this.syncTvChanges(yesterday, today, tvStats, tvErrors);

    await Promise.all([
      this.finishSyncLog(movieLog.id, movieStats, movieErrors),
      this.finishSyncLog(tvLog.id, tvStats, tvErrors),
    ]);

    return {
      movies: movieStats,
      tvSeries: tvStats,
    };
  }

  async importSingleMovie(tmdbId: number) {
    const existingMovie = await this.prismaService.movie.findUnique({
      where: { tmdbId },
    });

    if (existingMovie) {
      return existingMovie;
    }

    const detail = await this.tmdbClientService.getMovie(
      tmdbId,
      'credits,videos,images',
    );
    const movie = await this.upsertMovieFromDetail(detail);

    await this.safeSyncMovie(movie.id);

    return movie;
  }

  async importSingleTV(tmdbId: number) {
    const existingSeries = await this.prismaService.tVSeries.findUnique({
      where: { tmdbId },
    });

    if (existingSeries) {
      return existingSeries;
    }

    const detail = await this.tmdbClientService.getTVSeries(
      tmdbId,
      'credits,videos,images',
    );
    const series = await this.upsertSeriesFromDetail(detail);

    await this.safeSyncSeries(series.id);

    return series;
  }

  async syncTrending() {
    const windows = ['day', 'week'] as const;
    const results: Record<string, number> = {};

    for (const window of windows) {
      const [movies, tvSeries] = await Promise.all([
        this.tmdbClientService.getTrending('movie', window),
        this.tmdbClientService.getTrending('tv', window),
      ]);

      for (const movie of movies.results) {
        const existing = await this.prismaService.movie.findUnique({
          where: { tmdbId: movie.id },
          select: { id: true },
        });

        if (!existing) {
          await this.importSingleMovie(movie.id);
        }
      }

      for (const series of tvSeries.results) {
        const existing = await this.prismaService.tVSeries.findUnique({
          where: { tmdbId: series.id },
          select: { id: true },
        });

        if (!existing) {
          await this.importSingleTV(series.id);
        }
      }

      await Promise.all([
        this.redisService.set(`tmdb:trending:movie:${window}`, movies, 3600),
        this.redisService.set(`tmdb:trending:tv:${window}`, tvSeries, 3600),
      ]);
      results[`movie_${window}`] = movies.results.length;
      results[`tv_${window}`] = tvSeries.results.length;
    }

    return results;
  }

  async getSyncLogs(query: SyncLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TmdbSyncLogWhereInput = {
      ...(query.syncType ? { syncType: query.syncType } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [total, logs] = await this.prismaService.$transaction([
      this.prismaService.tmdbSyncLog.count({ where }),
      this.prismaService.tmdbSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async syncMovieChanges(
    startDate: string,
    endDate: string,
    stats: SyncStats,
    errors: ImportError[],
  ) {
    const response = await this.tmdbClientService.getMovieChanges(startDate, endDate, 1);

    for (const change of response.results) {
      const movie = await this.prismaService.movie.findUnique({
        where: { tmdbId: change.id },
      });

      if (!movie || movie.isAdminEdited) {
        continue;
      }

      await this.importMovieForBatch(change.id, stats, errors, true, true);
    }
  }

  private async syncTvChanges(
    startDate: string,
    endDate: string,
    stats: SyncStats,
    errors: ImportError[],
  ) {
    const response = await this.tmdbClientService.getTVChanges(startDate, endDate, 1);

    for (const change of response.results) {
      const series = await this.prismaService.tVSeries.findUnique({
        where: { tmdbId: change.id },
      });

      if (!series || series.isAdminEdited) {
        continue;
      }

      await this.importSeriesForBatch(change.id, stats, errors, true, true);
    }
  }

  private async importMovieForBatch(
    tmdbId: number,
    stats: SyncStats,
    errors: ImportError[],
    forceUpdate = false,
    syncSearch = false,
  ) {
    stats.totalProcessed += 1;

    try {
      const existing = await this.prismaService.movie.findUnique({ where: { tmdbId } });
      const detail = await this.tmdbClientService.getMovie(
        tmdbId,
        'credits,videos,images',
      );
      const movie = await this.upsertMovieFromDetail(detail, forceUpdate);

      if (existing) {
        stats.totalUpdated += 1;
      } else {
        stats.totalCreated += 1;
      }

      if (syncSearch) {
        await this.safeSyncMovie(movie.id);
      }

      this.logger.log(`Imported movie: ${movie.title}`);
    } catch (error) {
      stats.totalErrors += 1;
      errors.push({ entityType: 'MOVIE', tmdbId, message: String(error) });
    }
  }

  private async importSeriesForBatch(
    tmdbId: number,
    stats: SyncStats,
    errors: ImportError[],
    forceUpdate = false,
    syncSearch = false,
  ) {
    stats.totalProcessed += 1;

    try {
      const existing = await this.prismaService.tVSeries.findUnique({ where: { tmdbId } });
      const detail = await this.tmdbClientService.getTVSeries(
        tmdbId,
        'credits,videos,images',
      );
      const series = await this.upsertSeriesFromDetail(detail, forceUpdate);

      if (existing) {
        stats.totalUpdated += 1;
      } else {
        stats.totalCreated += 1;
      }

      if (syncSearch) {
        await this.safeSyncSeries(series.id);
      }

      this.logger.log(`Imported TV series: ${series.title}`);
    } catch (error) {
      stats.totalErrors += 1;
      errors.push({ entityType: 'TV', tmdbId, message: String(error) });
    }
  }

  private async upsertMovieFromDetail(
    detail: Parameters<TmdbMapperService['toMovie']>[0],
    forceUpdate = false,
  ) {
    const existing = await this.prismaService.movie.findUnique({
      where: { tmdbId: detail.id },
    });

    if (existing?.isAdminEdited && !forceUpdate) {
      return existing;
    }

    const mapped = this.tmdbMapperService.toMovie(detail);
    const [genreIds, countryIds, companyIds] = await Promise.all([
      this.upsertGenres(detail.genres),
      this.upsertCountries(mapped.countries),
      this.upsertCompanies(mapped.companies),
    ]);
    const movie = await this.prismaService.movie.upsert({
      where: { tmdbId: detail.id },
      update: this.buildMovieScalarUpdate(mapped),
      create: mapped.data,
    });

    await this.prismaService.movie.update({
      where: { id: movie.id },
      data: {
        genres: { set: genreIds.map((id) => ({ id })) },
        countries: { set: countryIds.map((id) => ({ id })) },
        companies: { set: companyIds.map((id) => ({ id })) },
      },
    });
    await this.replaceMovieCredits(movie.id, detail.credits);
    await this.replaceMovieMedia(movie.id, detail);

    return movie;
  }

  private async upsertSeriesFromDetail(
    detail: Parameters<TmdbMapperService['toTVSeries']>[0],
    forceUpdate = false,
  ) {
    const existing = await this.prismaService.tVSeries.findUnique({
      where: { tmdbId: detail.id },
    });

    if (existing?.isAdminEdited && !forceUpdate) {
      return existing;
    }

    const mapped = this.tmdbMapperService.toTVSeries(detail);
    const [genreIds, countryIds, companyIds] = await Promise.all([
      this.upsertGenres(detail.genres),
      this.upsertCountries(mapped.countries),
      this.upsertCompanies(mapped.companies),
    ]);
    const series = await this.prismaService.tVSeries.upsert({
      where: { tmdbId: detail.id },
      update: this.buildSeriesScalarUpdate(mapped),
      create: mapped.data,
    });

    await this.prismaService.tVSeries.update({
      where: { id: series.id },
      data: {
        genres: { set: genreIds.map((id) => ({ id })) },
        countries: { set: countryIds.map((id) => ({ id })) },
        companies: { set: companyIds.map((id) => ({ id })) },
      },
    });
    await this.replaceSeriesCredits(series.id, detail.credits);
    await this.replaceSeriesMedia(series.id, detail);
    await this.replaceSeasons(series.id, detail);

    return series;
  }

  private buildMovieScalarUpdate(mapped: MappedMovie): Prisma.MovieUpdateInput {
    return {
      ...mapped.data,
      genres: undefined,
      countries: undefined,
      companies: undefined,
    };
  }

  private buildSeriesScalarUpdate(mapped: MappedTvSeries): Prisma.TVSeriesUpdateInput {
    return {
      ...mapped.data,
      genres: undefined,
      countries: undefined,
      companies: undefined,
    };
  }

  private async upsertGenres(genres: Array<{ id: number; name: string }>) {
    const records = await Promise.all(
      genres.map((genre) =>
        this.prismaService.genre.upsert({
          where: { tmdbId: genre.id },
          update: { name: genre.name, slug: this.slugify(genre.name) },
          create: {
            tmdbId: genre.id,
            name: genre.name,
            slug: this.slugify(genre.name),
          },
        }),
      ),
    );

    return records.map((record) => record.id);
  }

  private async upsertCountries(countries: Array<{ isoCode: string; name: string }>) {
    const records = await Promise.all(
      countries.map((country) =>
        this.prismaService.country.upsert({
          where: { isoCode: country.isoCode },
          update: { name: country.name },
          create: country,
        }),
      ),
    );

    return records.map((record) => record.id);
  }

  private async upsertCompanies(companies: MappedMovie['companies']) {
    const records = await Promise.all(
      companies.map((company) =>
        this.prismaService.productionCompany.upsert({
          where: { tmdbId: company.tmdbId },
          update: {
            name: company.name,
            logoUrl: company.logoUrl,
            originCountry: company.originCountry,
          },
          create: company,
        }),
      ),
    );

    return records.map((record) => record.id);
  }

  private async upsertPeople(people: Array<Prisma.PersonCreateInput>) {
    const uniquePeople = new Map<number, Prisma.PersonCreateInput>();

    for (const person of people) {
      if (person.tmdbId) {
        uniquePeople.set(person.tmdbId, person);
      }
    }

    const records = await Promise.all(
      [...uniquePeople.values()].map((person) =>
        this.prismaService.person.upsert({
          where: { tmdbId: person.tmdbId ?? 0 },
          update: person,
          create: person,
        }),
      ),
    );

    return new Map(records.map((record) => [record.tmdbId, record.id]));
  }

  private async replaceMovieCredits(movieId: number, credits?: Parameters<TmdbMapperService['toCast']>[0]) {
    if (!credits) {
      return;
    }

    const cast = this.tmdbMapperService.toCast(credits, 50);
    const crew = this.tmdbMapperService.toCrew(credits);
    const personIds = await this.upsertPeople([...cast.people, ...crew.people]);

    await Promise.all([
      this.prismaService.movieCast.deleteMany({ where: { movieId } }),
      this.prismaService.movieCrew.deleteMany({ where: { movieId } }),
    ]);
    await Promise.all([
      this.prismaService.movieCast.createMany({
        data: cast.cast
          .flatMap((item) => {
            const personId = personIds.get(item.personTmdbId);

            return personId
              ? [{
                  movieId,
                  personId,
                  character: item.character,
                  displayOrder: item.displayOrder,
                }]
              : [];
          }),
        skipDuplicates: true,
      }),
      this.prismaService.movieCrew.createMany({
        data: crew.crew
          .flatMap((item) => {
            const personId = personIds.get(item.personTmdbId);

            return personId
              ? [{
                  movieId,
                  personId,
                  job: item.job,
                  department: item.department,
                }]
              : [];
          }),
        skipDuplicates: true,
      }),
    ]);
  }

  private async replaceSeriesCredits(seriesId: number, credits?: Parameters<TmdbMapperService['toCast']>[0]) {
    if (!credits) {
      return;
    }

    const cast = this.tmdbMapperService.toCast(credits, 50);
    const crew = this.tmdbMapperService.toCrew(credits);
    const personIds = await this.upsertPeople([...cast.people, ...crew.people]);

    await Promise.all([
      this.prismaService.seriesCast.deleteMany({ where: { seriesId } }),
      this.prismaService.seriesCrew.deleteMany({ where: { seriesId } }),
    ]);
    await Promise.all([
      this.prismaService.seriesCast.createMany({
        data: cast.cast
          .flatMap((item) => {
            const personId = personIds.get(item.personTmdbId);

            return personId
              ? [{
                  seriesId,
                  personId,
                  character: item.character,
                  displayOrder: item.displayOrder,
                }]
              : [];
          }),
        skipDuplicates: true,
      }),
      this.prismaService.seriesCrew.createMany({
        data: crew.crew
          .flatMap((item) => {
            const personId = personIds.get(item.personTmdbId);

            return personId
              ? [{
                  seriesId,
                  personId,
                  job: item.job,
                  department: item.department,
                }]
              : [];
          }),
        skipDuplicates: true,
      }),
    ]);
  }

  private async replaceMovieMedia(movieId: number, detail: Parameters<TmdbMapperService['toMovie']>[0]) {
    const videos = await this.getMovieVideosWithFallback(detail);
    const trailers = this.tmdbMapperService.toTrailers(videos);
    const images = this.tmdbMapperService.toImages(detail.images);

    await Promise.all([
      this.prismaService.trailer.deleteMany({ where: { movieId } }),
      this.prismaService.image.deleteMany({ where: { movieId } }),
    ]);
    await Promise.all([
      trailers.length
        ? this.prismaService.trailer.createMany({
            data: trailers.map((trailer) => ({ ...trailer, movieId })),
          })
        : Promise.resolve(),
      images.length
        ? this.prismaService.image.createMany({
            data: images.map((image) => ({ ...image, movieId })),
          })
        : Promise.resolve(),
    ]);
    await this.invalidateMovieCaches(movieId);
  }

  private async replaceSeriesMedia(seriesId: number, detail: Parameters<TmdbMapperService['toTVSeries']>[0]) {
    const videos = await this.getSeriesVideosWithFallback(detail);
    const trailers = this.tmdbMapperService.toTrailers(videos);
    const images = this.tmdbMapperService.toImages(detail.images);

    await Promise.all([
      this.prismaService.trailer.deleteMany({ where: { seriesId } }),
      this.prismaService.image.deleteMany({ where: { seriesId } }),
    ]);
    await Promise.all([
      trailers.length
        ? this.prismaService.trailer.createMany({
            data: trailers.map((trailer) => ({ ...trailer, seriesId })),
          })
        : Promise.resolve(),
      images.length
        ? this.prismaService.image.createMany({
            data: images.map((image) => ({ ...image, seriesId })),
          })
        : Promise.resolve(),
    ]);
    await this.invalidateSeriesCaches(seriesId);
  }

  private async replaceSeasons(seriesId: number, detail: Parameters<TmdbMapperService['toTVSeries']>[0]) {
    for (const seasonSummary of detail.seasons) {
      const seasonDetail = await this.tmdbClientService.getTVSeason(
        detail.id,
        seasonSummary.season_number,
      );
      const mapped = this.tmdbMapperService.toSeason(seasonDetail);
      const season = await this.prismaService.season.upsert({
        where: {
          seriesId_seasonNumber: {
            seriesId,
            seasonNumber: mapped.data.seasonNumber,
          },
        },
        update: mapped.data,
        create: {
          ...mapped.data,
          seriesId,
        },
      });

      await this.prismaService.episode.deleteMany({
        where: { seasonId: season.id },
      });

      if (mapped.episodes.length > 0) {
        await this.prismaService.episode.createMany({
          data: mapped.episodes.map((episode) => ({
            ...episode,
            seasonId: season.id,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  private async getMovieVideosWithFallback(
    detail: Parameters<TmdbMapperService['toMovie']>[0],
  ): Promise<TmdbVideos | undefined> {
    const localizedVideos = detail.videos;
    const localizedTrailers = this.tmdbMapperService.toTrailers(localizedVideos);

    if (localizedTrailers.length > 0) {
      return localizedVideos;
    }

    try {
      const fallbackVideos = await this.tmdbClientService.getMovieVideos(detail.id, 'en-US');

      return this.mergeVideos(localizedVideos, fallbackVideos);
    } catch (error) {
      this.logger.warn(`Failed to fetch fallback movie videos for TMDB ${detail.id}: ${String(error)}`);

      return localizedVideos;
    }
  }

  private async getSeriesVideosWithFallback(
    detail: Parameters<TmdbMapperService['toTVSeries']>[0],
  ): Promise<TmdbVideos | undefined> {
    const localizedVideos = detail.videos;
    const localizedTrailers = this.tmdbMapperService.toTrailers(localizedVideos);

    if (localizedTrailers.length > 0) {
      return localizedVideos;
    }

    try {
      const fallbackVideos = await this.tmdbClientService.getTVSeriesVideos(
        detail.id,
        'en-US',
        'en-US,en,null',
      );

      return this.mergeVideos(localizedVideos, fallbackVideos);
    } catch (error) {
      this.logger.warn(`Failed to fetch fallback TV videos for TMDB ${detail.id}: ${String(error)}`);

      return localizedVideos;
    }
  }

  private mergeVideos(...videoGroups: Array<TmdbVideos | undefined>): TmdbVideos {
    const videos = new Map<string, TmdbVideos['results'][number]>();

    for (const group of videoGroups) {
      for (const video of group?.results ?? []) {
        videos.set(video.id || `${video.site}:${video.key}`, video);
      }
    }

    return {
      results: [...videos.values()],
    };
  }

  private async invalidateMovieCaches(movieId: number) {
    await Promise.allSettled([
      this.redisService.del(`movie:${movieId}`),
      this.redisService.del(`movie:${movieId}:similar`),
      this.redisService.delPattern('movies:*'),
    ]);
  }

  private async invalidateSeriesCaches(seriesId: number) {
    await Promise.allSettled([
      this.redisService.del(`tv:${seriesId}`),
      this.redisService.del(`tv:${seriesId}:similar`),
      this.redisService.delPattern('tv:*'),
    ]);
  }

  private async startSyncLog(syncType: string, entityType: string) {
    return this.prismaService.tmdbSyncLog.create({
      data: {
        syncType,
        entityType,
        startedAt: new Date(),
        status: 'RUNNING',
      },
    });
  }

  private async finishSyncLog(logId: number, stats: SyncStats, errors: ImportError[]) {
    await this.prismaService.tmdbSyncLog.update({
      where: { id: logId },
      data: {
        ...stats,
        status: stats.totalErrors > 0 ? 'COMPLETED_WITH_ERRORS' : 'SUCCESS',
        completedAt: new Date(),
        errorDetails: errors.length > 0 ? errors : Prisma.JsonNull,
      },
    });
  }

  private async failSyncLog(
    logId: number,
    stats: SyncStats,
    errors: ImportError[],
    entityType: string,
    error: unknown,
  ) {
    await this.prismaService.tmdbSyncLog.update({
      where: { id: logId },
      data: {
        ...stats,
        totalErrors: stats.totalErrors + 1,
        status: 'FAILED',
        completedAt: new Date(),
        errorDetails: [
          ...errors,
          {
            entityType,
            tmdbId: -1,
            message: String(error),
          },
        ],
      },
    });
  }

  private async safeSyncAllSearch() {
    try {
      await this.searchSyncService.syncAll();
    } catch (error) {
      this.logger.warn(`Failed to rebuild search indexes after TMDB import: ${String(error)}`);
    }
  }

  private async safeSyncMovie(movieId: number) {
    try {
      await this.searchSyncService.syncMovie(movieId);
    } catch (error) {
      this.logger.warn(`Failed to sync movie ${movieId} to search: ${String(error)}`);
    }
  }

  private async safeSyncSeries(seriesId: number) {
    try {
      await this.searchSyncService.syncSeries(seriesId);
    } catch (error) {
      this.logger.warn(`Failed to sync TV series ${seriesId} to search: ${String(error)}`);
    }
  }

  private emptyStats(): SyncStats {
    return {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalErrors: 0,
    };
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
