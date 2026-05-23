import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  GenreDistributionMediaType,
  GenreDistributionQueryDto,
  RatingsTimeSeriesQueryDto,
  TopMoviesChartQueryDto,
} from '@/modules/admin-dashboard/dto/chart-query.dto';
import { PrismaService } from '@/prisma/prisma.service';

type RatingsTimeSeriesRow = {
  date: Date | string;
  totalRatings: number | bigint | string;
  averageScore: number | string | null;
};

type TopMovieChartRow = {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseDate: Date | null;
  voteAverage: number | string;
  voteCount: number | bigint | string;
  totalRatings: number | bigint | string;
  averageScore: number | string | null;
};

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getRatingsTimeSeries(query: RatingsTimeSeriesQueryDto) {
    const days = query.days ?? 30;
    const rows = await this.prismaService.$queryRaw<RatingsTimeSeriesRow[]>(Prisma.sql`
      WITH series AS (
        SELECT generate_series(
          (CURRENT_DATE - (${days}::int - 1)),
          CURRENT_DATE,
          interval '1 day'
        )::date AS date
      )
      SELECT
        series.date AS "date",
        COUNT(r.id)::int AS "totalRatings",
        AVG(r.score)::float AS "averageScore"
      FROM series
      LEFT JOIN "Rating" r ON DATE(r."createdAt") = series.date
      GROUP BY series.date
      ORDER BY series.date ASC
    `);

    return {
      data: rows.map((row) => ({
        date: this.formatDate(row.date),
        totalRatings: this.toNumber(row.totalRatings),
        averageScore: this.toNullableRoundedNumber(row.averageScore),
      })),
    };
  }

  async getTopMovies(query: TopMoviesChartQueryDto) {
    const days = query.days ?? 30;
    const limit = query.limit ?? 10;
    const rows = await this.prismaService.$queryRaw<TopMovieChartRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.title,
        m."posterUrl" AS "posterUrl",
        m."releaseDate" AS "releaseDate",
        m."voteAverage" AS "voteAverage",
        m."voteCount" AS "voteCount",
        COUNT(r.id)::int AS "totalRatings",
        AVG(r.score)::float AS "averageScore"
      FROM "Rating" r
      INNER JOIN "Movie" m ON m.id = r."movieId"
      WHERE
        r."movieId" IS NOT NULL
        AND m."isDeleted" = false
        AND r."createdAt" >= (CURRENT_DATE - (${days}::int - 1))
      GROUP BY m.id
      ORDER BY COUNT(r.id) DESC, AVG(r.score) DESC, m."voteAverage" DESC
      LIMIT ${limit}
    `);

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        posterUrl: row.posterUrl,
        releaseDate: row.releaseDate,
        voteAverage: this.toRoundedNumber(row.voteAverage),
        voteCount: this.toNumber(row.voteCount),
        totalRatings: this.toNumber(row.totalRatings),
        averageScore: this.toNullableRoundedNumber(row.averageScore),
      })),
    };
  }

  async getGenreDistribution(query: GenreDistributionQueryDto) {
    const limit = query.limit ?? 10;
    const mediaType = query.media_type ?? GenreDistributionMediaType.ALL;
    const genres = await this.prismaService.genre.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            movies: {
              where: {
                isDeleted: false,
              },
            },
            tvSeries: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    const data = genres
      .map((genre) => {
        const movieCount =
          mediaType === GenreDistributionMediaType.TV ? 0 : genre._count.movies;
        const tvCount =
          mediaType === GenreDistributionMediaType.MOVIE ? 0 : genre._count.tvSeries;

        return {
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
          movieCount,
          tvCount,
          totalCount: movieCount + tvCount,
        };
      })
      .filter((genre) => genre.totalCount > 0)
      .sort((left, right) => right.totalCount - left.totalCount || left.name.localeCompare(right.name))
      .slice(0, limit);

    return { data };
  }

  private formatDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }

  private toNumber(value: number | bigint | string) {
    return Number(value);
  }

  private toRoundedNumber(value: number | string) {
    return Math.round(Number(value) * 100) / 100;
  }

  private toNullableRoundedNumber(value: number | string | null) {
    if (value === null) {
      return null;
    }

    return this.toRoundedNumber(value);
  }
}
