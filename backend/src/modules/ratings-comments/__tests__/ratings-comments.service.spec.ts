import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CommentStatus,
  ReportStatus,
  UserRole,
} from '@prisma/client';
import { validate } from 'class-validator';

import { CreateRatingDto } from '@/modules/ratings-comments/dto/create-rating.dto';
import { RatingsCommentsService } from '@/modules/ratings-comments/ratings-comments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('RatingsCommentsService', () => {
  const prismaService = {
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    movie: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    tVSeries: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    rating: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    comment: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    report: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    del: jest.fn(),
    delPattern: jest.fn(),
  } as unknown as RedisService;

  const userId = '8a3c3f62-6805-4c4e-bdd0-516b8f318dc5';
  let service: RatingsCommentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RatingsCommentsService(prismaService, redisService);
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.movie.findUniqueOrThrow = jest.fn().mockResolvedValue({
      voteAverage: 8.5,
      voteCount: 2,
    });
    prismaService.tVSeries.findUniqueOrThrow = jest.fn().mockResolvedValue({
      voteAverage: 7,
      voteCount: 1,
    });
    prismaService.$executeRaw = jest.fn().mockResolvedValue(1);
    prismaService.activityLog.create = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.comment.count = jest.fn().mockResolvedValue(1);
    prismaService.comment.findMany = jest.fn().mockResolvedValue([createAdminComment()]);
    prismaService.report.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.delPattern = jest.fn().mockResolvedValue(undefined);
  });

  function createAdminComment(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      content: 'Great movie',
      status: CommentStatus.ACTIVE,
      movieId: 1,
      seriesId: null,
      user: {
        id: userId,
        email: 'user@example.com',
        displayName: 'User',
        avatarUrl: null,
      },
      movie: {
        id: 1,
        title: 'Movie',
        posterUrl: 'poster.jpg',
      },
      series: null,
      _count: {
        reports: 1,
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    };
  }

  async function expectHttpStatus(promise: Promise<unknown>, status: HttpStatus) {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
    }
  }

  it('rates a movie with upsert, aggregate recalculation, cache invalidation, and activity log', async () => {
    prismaService.rating.upsert = jest.fn().mockResolvedValue({
      id: 10,
      score: 9,
    });

    const result = await service.rateMovie(userId, 1, { score: 9 });

    expect(result).toEqual({
      score: 9,
      movieVoteAverage: 8.5,
      movieVoteCount: 2,
    });
    expect(prismaService.rating.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_movieId: {
            userId,
            movieId: 1,
          },
        },
        update: {
          score: 9,
        },
      }),
    );
    expect(prismaService.$executeRaw).toHaveBeenCalled();
    expect(redisService.del).toHaveBeenCalledWith('movie:1');
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RATE',
          entityType: 'MOVIE',
          entityId: 1,
        }),
      }),
    );
  });

  it('rejects invalid rating scores at DTO validation level', async () => {
    const dto = new CreateRatingDto();
    dto.score = 11;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('deletes a movie rating and recalculates aggregates', async () => {
    prismaService.rating.findUnique = jest.fn().mockResolvedValue({ id: 10 });
    prismaService.rating.delete = jest.fn().mockResolvedValue({ id: 10 });

    const result = await service.deleteMovieRating(userId, 1);

    expect(result).toEqual({
      score: null,
      movieVoteAverage: 8.5,
      movieVoteCount: 2,
    });
    expect(prismaService.rating.delete).toHaveBeenCalledWith({
      where: {
        id: 10,
      },
    });
  });

  it('throws 404 when deleting a missing rating', async () => {
    prismaService.rating.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(service.deleteMovieRating(userId, 1), HttpStatus.NOT_FOUND);
  });

  it('rates and deletes a TV series rating', async () => {
    prismaService.rating.upsert = jest.fn().mockResolvedValue({
      id: 11,
      score: 7,
    });
    prismaService.rating.findUnique = jest.fn().mockResolvedValue({ id: 11 });
    prismaService.rating.delete = jest.fn().mockResolvedValue({ id: 11 });

    const rated = await service.rateSeries(userId, 1, { score: 7 });
    const deleted = await service.deleteSeriesRating(userId, 1);

    expect(rated.seriesVoteAverage).toBe(7);
    expect(deleted.seriesVoteCount).toBe(1);
    expect(redisService.del).toHaveBeenCalledWith('tv:1');
  });

  it('gets current user ratings with pagination', async () => {
    prismaService.$transaction = jest.fn().mockResolvedValue([
      1,
      [
        {
          id: 1,
          score: 9,
          movie: {
            id: 1,
            title: 'Movie',
            posterUrl: 'poster.jpg',
          },
          series: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const result = await service.getMyRatings(userId, {
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('creates a comment and logs activity', async () => {
    prismaService.comment.create = jest.fn().mockResolvedValue({
      id: 1,
      content: 'Great movie',
      status: CommentStatus.ACTIVE,
      movieId: 1,
      seriesId: null,
      user: {
        id: userId,
        displayName: 'User',
        avatarUrl: null,
      },
    });

    const result = await service.createComment(userId, {
      movieId: 1,
      content: 'Great movie',
    });

    expect(result.id).toBe(1);
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'COMMENT',
          entityType: 'MOVIE',
        }),
      }),
    );
  });

  it('rejects comments that target both movie and TV series', async () => {
    await expectHttpStatus(
      service.createComment(userId, {
        movieId: 1,
        seriesId: 1,
        content: 'Valid content',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects banned words before saving a comment', async () => {
    await expectHttpStatus(
      service.createComment(userId, {
        movieId: 1,
        content: 'This is spam content',
      }),
      HttpStatus.BAD_REQUEST,
    );
    expect(prismaService.comment.create).not.toHaveBeenCalled();
  });

  it('updates a comment only for its owner', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      userId,
      status: CommentStatus.ACTIVE,
    });
    prismaService.comment.update = jest.fn().mockResolvedValue({
      id: 1,
      content: 'Updated',
      user: {
        id: userId,
        displayName: 'User',
        avatarUrl: null,
      },
    });

    const result = await service.updateComment(userId, 1, {
      content: 'Updated',
    });

    expect(result.content).toBe('Updated');
  });

  it('rejects comment edits from non-owners', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      userId: 'another-user',
      status: CommentStatus.ACTIVE,
    });

    await expectHttpStatus(
      service.updateComment(userId, 1, {
        content: 'Updated',
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it('soft deletes a comment for owner or admin', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      userId: 'another-user',
      status: CommentStatus.ACTIVE,
    });
    prismaService.comment.update = jest.fn().mockResolvedValue({
      id: 1,
      status: CommentStatus.DELETED,
    });

    const result = await service.deleteComment(userId, UserRole.ADMIN, 1);

    expect(result.message).toBe('Comment deleted successfully');
    expect(prismaService.comment.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        status: CommentStatus.DELETED,
      },
    });
  });

  it('reports a comment once per user', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      userId: 'comment-owner',
      status: CommentStatus.ACTIVE,
    });
    prismaService.report.findFirst = jest.fn().mockResolvedValue(null);
    prismaService.report.create = jest.fn().mockResolvedValue({
      id: 1,
      status: 'PENDING',
    });

    const result = await service.reportComment(userId, 1, {
      reason: 'Abusive language',
    });

    expect(result.message).toBe('Comment reported successfully');
  });

  it('rejects duplicate reports', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      userId: 'comment-owner',
      status: CommentStatus.ACTIVE,
    });
    prismaService.report.findFirst = jest.fn().mockResolvedValue({ id: 1 });

    await expectHttpStatus(
      service.reportComment(userId, 1, {
        reason: 'Duplicate',
      }),
      HttpStatus.CONFLICT,
    );
  });

  it('gets admin comments with filters and report counts', async () => {
    prismaService.$transaction = jest.fn().mockResolvedValue([
      1,
      [createAdminComment()],
    ]);

    const result = await service.getAdminComments({
      page: 1,
      limit: 20,
      status: CommentStatus.ACTIVE,
      q: 'movie',
      reportedOnly: true,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 1,
        reportCount: 1,
        movie: expect.objectContaining({
          title: 'Movie',
        }),
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('hides a comment and resolves pending reports', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      status: CommentStatus.ACTIVE,
    });
    prismaService.comment.update = jest.fn().mockResolvedValue(createAdminComment({
      status: CommentStatus.HIDDEN,
    }));

    const result = await service.hideComment(userId, 1, {
      resolveReports: true,
      reason: 'Reported abuse',
    });

    expect(result.status).toBe(CommentStatus.HIDDEN);
    expect(prismaService.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CommentStatus.HIDDEN,
        }),
      }),
    );
    expect(prismaService.report.updateMany).toHaveBeenCalledWith({
      where: {
        commentId: 1,
        status: ReportStatus.PENDING,
      },
      data: expect.objectContaining({
        status: ReportStatus.RESOLVED,
        resolvedBy: userId,
      }),
    });
    expect(redisService.del).toHaveBeenCalledWith('movie:1');
  });

  it('soft deletes a comment as admin moderation', async () => {
    prismaService.comment.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      status: CommentStatus.ACTIVE,
    });
    prismaService.comment.update = jest.fn().mockResolvedValue(createAdminComment({
      status: CommentStatus.DELETED,
    }));

    const result = await service.deleteAdminComment(userId, 1);

    expect(result.status).toBe(CommentStatus.DELETED);
    expect(prismaService.report.updateMany).toHaveBeenCalled();
  });
});
