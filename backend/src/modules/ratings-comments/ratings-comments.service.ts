import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  CommentStatus,
  Prisma,
  ReportStatus,
  UserRole,
} from '@prisma/client';

import { BANNED_WORDS } from '@/config/banned-words';
import type { CreateCommentDto } from '@/modules/ratings-comments/dto/create-comment.dto';
import type { CreateRatingDto } from '@/modules/ratings-comments/dto/create-rating.dto';
import type { ModerateCommentDto } from '@/modules/ratings-comments/dto/moderate-comment.dto';
import type { QueryAdminCommentsDto } from '@/modules/ratings-comments/dto/query-admin-comments.dto';
import type { QueryRatingDto } from '@/modules/ratings-comments/dto/query-rating.dto';
import type { ReportCommentDto } from '@/modules/ratings-comments/dto/report-comment.dto';
import type { UpdateCommentDto } from '@/modules/ratings-comments/dto/update-comment.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type Aggregate = {
  voteAverage: number;
  voteCount: number;
};

@Injectable()
export class RatingsCommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async rateMovie(userId: string, movieId: number, dto: CreateRatingDto) {
    await this.ensureMovieExists(movieId);

    const rating = await this.prismaService.rating.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      create: {
        userId,
        movieId,
        score: dto.score,
      },
      update: {
        score: dto.score,
      },
    });

    const aggregate = await this.recalculateMovieRating(movieId);
    await Promise.all([
      this.invalidateMovieCaches(movieId),
      this.logActivity(userId, 'RATE', 'MOVIE', movieId, {
        score: dto.score,
        ratingId: rating.id,
      }),
    ]);

    return {
      score: rating.score,
      movieVoteAverage: aggregate.voteAverage,
      movieVoteCount: aggregate.voteCount,
    };
  }

  async deleteMovieRating(userId: string, movieId: number) {
    await this.ensureMovieExists(movieId);

    const rating = await this.prismaService.rating.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!rating) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Rating not found.', 'Not Found');
    }

    await this.prismaService.rating.delete({
      where: {
        id: rating.id,
      },
    });

    const aggregate = await this.recalculateMovieRating(movieId);
    await Promise.all([
      this.invalidateMovieCaches(movieId),
      this.logActivity(userId, 'RATE_DELETE', 'MOVIE', movieId),
    ]);

    return {
      score: null,
      movieVoteAverage: aggregate.voteAverage,
      movieVoteCount: aggregate.voteCount,
    };
  }

  async rateSeries(userId: string, seriesId: number, dto: CreateRatingDto) {
    await this.ensureSeriesExists(seriesId);

    const rating = await this.prismaService.rating.upsert({
      where: {
        userId_seriesId: {
          userId,
          seriesId,
        },
      },
      create: {
        userId,
        seriesId,
        score: dto.score,
      },
      update: {
        score: dto.score,
      },
    });

    const aggregate = await this.recalculateSeriesRating(seriesId);
    await Promise.all([
      this.invalidateSeriesCaches(seriesId),
      this.logActivity(userId, 'RATE', 'TV', seriesId, {
        score: dto.score,
        ratingId: rating.id,
      }),
    ]);

    return {
      score: rating.score,
      seriesVoteAverage: aggregate.voteAverage,
      seriesVoteCount: aggregate.voteCount,
    };
  }

  async deleteSeriesRating(userId: string, seriesId: number) {
    await this.ensureSeriesExists(seriesId);

    const rating = await this.prismaService.rating.findUnique({
      where: {
        userId_seriesId: {
          userId,
          seriesId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!rating) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Rating not found.', 'Not Found');
    }

    await this.prismaService.rating.delete({
      where: {
        id: rating.id,
      },
    });

    const aggregate = await this.recalculateSeriesRating(seriesId);
    await Promise.all([
      this.invalidateSeriesCaches(seriesId),
      this.logActivity(userId, 'RATE_DELETE', 'TV', seriesId),
    ]);

    return {
      score: null,
      seriesVoteAverage: aggregate.voteAverage,
      seriesVoteCount: aggregate.voteCount,
    };
  }

  async getMyRatings(userId: string, query: QueryRatingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, ratings] = await this.prismaService.$transaction([
      this.prismaService.rating.count({
        where: {
          userId,
        },
      }),
      this.prismaService.rating.findMany({
        where: {
          userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          score: true,
          createdAt: true,
          updatedAt: true,
          movie: {
            select: {
              id: true,
              title: true,
              posterUrl: true,
            },
          },
          series: {
            select: {
              id: true,
              title: true,
              posterUrl: true,
            },
          },
        },
      }),
    ]);

    return {
      data: ratings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createComment(userId: string, dto: CreateCommentDto) {
    this.validateCommentTarget(dto.movieId, dto.seriesId);
    this.ensureAllowedContent(dto.content);

    if (dto.movieId) {
      await this.ensureMovieExists(dto.movieId);
    }

    if (dto.seriesId) {
      await this.ensureSeriesExists(dto.seriesId);
    }

    const content = dto.content.trim();
    const comment = await this.prismaService.comment.create({
      data: {
        userId,
        content,
        movieId: dto.movieId ?? null,
        seriesId: dto.seriesId ?? null,
        status: CommentStatus.ACTIVE,
      },
      include: this.commentInclude(),
    });

    await this.logActivity(
      userId,
      'COMMENT',
      dto.movieId ? 'MOVIE' : 'TV',
      dto.movieId ?? dto.seriesId,
      { commentId: comment.id },
    );

    return comment;
  }

  async updateComment(userId: string, commentId: number, dto: UpdateCommentDto) {
    this.ensureAllowedContent(dto.content);

    const comment = await this.prismaService.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Comment not found.', 'Not Found');
    }

    if (comment.userId !== userId) {
      throw this.createHttpException(HttpStatus.FORBIDDEN, 'Only the owner can edit this comment.', 'Forbidden');
    }

    const updatedComment = await this.prismaService.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: dto.content.trim(),
      },
      include: this.commentInclude(),
    });

    await this.logActivity(userId, 'COMMENT_UPDATE', 'COMMENT', commentId);

    return updatedComment;
  }

  async deleteComment(userId: string, role: UserRole, commentId: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Comment not found.', 'Not Found');
    }

    if (comment.userId !== userId && role !== UserRole.ADMIN) {
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        'Only the owner or an admin can delete this comment.',
        'Forbidden',
      );
    }

    await this.prismaService.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status: CommentStatus.DELETED,
      },
    });

    await this.logActivity(userId, 'COMMENT_DELETE', 'COMMENT', commentId);

    return {
      message: 'Comment deleted successfully',
    };
  }

  async reportComment(userId: string, commentId: number, dto: ReportCommentDto) {
    const comment = await this.prismaService.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!comment || comment.status !== CommentStatus.ACTIVE) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Comment not found.', 'Not Found');
    }

    const existingReport = await this.prismaService.report.findFirst({
      where: {
        reporterId: userId,
        commentId,
      },
      select: {
        id: true,
      },
    });

    if (existingReport) {
      throw this.createHttpException(
        HttpStatus.CONFLICT,
        'You have already reported this comment.',
        'Conflict',
      );
    }

    const report = await this.prismaService.report.create({
      data: {
        reporterId: userId,
        commentId,
        targetUserId: comment.userId,
        reason: dto.reason.trim(),
      },
      select: {
        id: true,
        status: true,
      },
    });

    await this.logActivity(userId, 'REPORT', 'COMMENT', commentId, {
      reportId: report.id,
    });

    return {
      ...report,
      message: 'Comment reported successfully',
    };
  }

  async getAdminComments(query: QueryAdminCommentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildAdminCommentWhere(query);

    const [total, comments] = await this.prismaService.$transaction([
      this.prismaService.comment.count({ where }),
      this.prismaService.comment.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: this.adminCommentInclude(),
      }),
    ]);

    return {
      data: comments.map((comment) => this.serializeAdminComment(comment)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async moderateComment(actorId: string, commentId: number, dto: ModerateCommentDto) {
    if (dto.content !== undefined) {
      this.ensureAllowedContent(dto.content);
    }

    const existingComment = await this.findAdminModeratableComment(commentId);
    const updatedComment = await this.prismaService.comment.update({
      where: {
        id: existingComment.id,
      },
      data: {
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: this.adminCommentInclude(),
    });

    await Promise.all([
      this.invalidateCommentTargetCaches(updatedComment.movieId, updatedComment.seriesId),
      ...(dto.resolveReports
        ? [this.resolvePendingReportsForComment(actorId, updatedComment.id)]
        : []),
      this.logActivity(actorId, 'ADMIN_COMMENT_MODERATE', 'COMMENT', updatedComment.id, {
        fields: Object.keys(dto),
        status: dto.status ?? existingComment.status,
        ...(dto.reason?.trim() ? { reason: dto.reason.trim() } : {}),
      }),
    ]);

    return this.serializeAdminComment(updatedComment);
  }

  async hideComment(actorId: string, commentId: number, dto: ModerateCommentDto) {
    return this.moderateComment(actorId, commentId, {
      ...dto,
      status: CommentStatus.HIDDEN,
    });
  }

  async restoreComment(actorId: string, commentId: number, dto: ModerateCommentDto) {
    return this.moderateComment(actorId, commentId, {
      ...dto,
      status: CommentStatus.ACTIVE,
    });
  }

  async deleteAdminComment(actorId: string, commentId: number) {
    return this.moderateComment(actorId, commentId, {
      status: CommentStatus.DELETED,
      resolveReports: true,
    });
  }

  private buildAdminCommentWhere(query: QueryAdminCommentsDto): Prisma.CommentWhereInput {
    const search = query.q?.trim();

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.movieId ? { movieId: query.movieId } : {}),
      ...(query.seriesId ? { seriesId: query.seriesId } : {}),
      ...(query.reportedOnly
        ? {
            reports: {
              some: {
                status: ReportStatus.PENDING,
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                content: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                user: {
                  displayName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                movie: {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                series: {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private async findAdminModeratableComment(commentId: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!comment) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'Comment not found.', 'Not Found');
    }

    return comment;
  }

  private adminCommentInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      movie: {
        select: {
          id: true,
          title: true,
          posterUrl: true,
        },
      },
      series: {
        select: {
          id: true,
          title: true,
          posterUrl: true,
        },
      },
      _count: {
        select: {
          reports: true,
        },
      },
    } satisfies Prisma.CommentInclude;
  }

  private serializeAdminComment(comment: {
    id: number;
    content: string;
    status: CommentStatus;
    movieId: number | null;
    seriesId: number | null;
    user: {
      id: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
    };
    movie: {
      id: number;
      title: string;
      posterUrl: string | null;
    } | null;
    series: {
      id: number;
      title: string;
      posterUrl: string | null;
    } | null;
    _count: {
      reports: number;
    };
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: comment.id,
      content: comment.content,
      status: comment.status,
      movieId: comment.movieId,
      seriesId: comment.seriesId,
      user: comment.user,
      movie: comment.movie,
      series: comment.series,
      reportCount: comment._count.reports,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private async resolvePendingReportsForComment(actorId: string, commentId: number) {
    await this.prismaService.report.updateMany({
      where: {
        commentId,
        status: ReportStatus.PENDING,
      },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedBy: actorId,
        resolvedAt: new Date(),
      },
    });
  }

  private async invalidateCommentTargetCaches(movieId: number | null, seriesId: number | null) {
    if (movieId) {
      await this.invalidateMovieCaches(movieId);
    }

    if (seriesId) {
      await this.invalidateSeriesCaches(seriesId);
    }
  }

  private async ensureMovieExists(movieId: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id: movieId,
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

  private async recalculateMovieRating(movieId: number): Promise<Aggregate> {
    await this.prismaService.$executeRaw`
      UPDATE "Movie"
      SET
        "voteAverage" = (
          SELECT COALESCE(ROUND(AVG(score)::numeric, 1)::double precision, 0::double precision)
          FROM "Rating"
          WHERE "movieId" = ${movieId}
        ),
        "voteCount" = (
          SELECT COUNT(*)::integer
          FROM "Rating"
          WHERE "movieId" = ${movieId}
        )
      WHERE id = ${movieId}
    `;

    const movie = await this.prismaService.movie.findUniqueOrThrow({
      where: {
        id: movieId,
      },
      select: {
        voteAverage: true,
        voteCount: true,
      },
    });

    return movie;
  }

  private async recalculateSeriesRating(seriesId: number): Promise<Aggregate> {
    await this.prismaService.$executeRaw`
      UPDATE "TVSeries"
      SET
        "voteAverage" = (
          SELECT COALESCE(ROUND(AVG(score)::numeric, 1)::double precision, 0::double precision)
          FROM "Rating"
          WHERE "seriesId" = ${seriesId}
        ),
        "voteCount" = (
          SELECT COUNT(*)::integer
          FROM "Rating"
          WHERE "seriesId" = ${seriesId}
        )
      WHERE id = ${seriesId}
    `;

    const series = await this.prismaService.tVSeries.findUniqueOrThrow({
      where: {
        id: seriesId,
      },
      select: {
        voteAverage: true,
        voteCount: true,
      },
    });

    return series;
  }

  private validateCommentTarget(movieId?: number, seriesId?: number) {
    if ((movieId && seriesId) || (!movieId && !seriesId)) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Provide either movieId or seriesId, not both.',
        'Bad Request',
      );
    }
  }

  private ensureAllowedContent(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw this.createHttpException(HttpStatus.BAD_REQUEST, 'Comment content is required.', 'Bad Request');
    }

    const normalizedContent = trimmedContent.toLocaleLowerCase('vi-VN');
    const bannedWord = BANNED_WORDS.find((word) =>
      normalizedContent.includes(word.toLocaleLowerCase('vi-VN')),
    );

    if (bannedWord) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'ERR_COMMENT_002: Comment contains disallowed content.',
        'ERR_COMMENT_002',
      );
    }
  }

  private commentInclude() {
    return {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    } satisfies Prisma.CommentInclude;
  }

  private async invalidateMovieCaches(movieId: number) {
    await Promise.all([
      this.redisService.del(`movie:${movieId}`),
      this.redisService.del(`movie:${movieId}:similar`),
      this.redisService.delPattern('movies:*'),
    ]);
  }

  private async invalidateSeriesCaches(seriesId: number) {
    await Promise.all([
      this.redisService.del(`tv:${seriesId}`),
      this.redisService.del(`tv:${seriesId}:similar`),
      this.redisService.delPattern('tv:*'),
    ]);
  }

  private async logActivity(
    userId: string,
    action: string,
    entityType?: string,
    entityId?: number,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prismaService.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
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
