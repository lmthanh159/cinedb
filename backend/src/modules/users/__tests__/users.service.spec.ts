import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CommentStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { validate } from 'class-validator';

import { ChangeUserPasswordDto } from '@/modules/users/dto/change-user-password.dto';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('UsersService', () => {
  const prismaService = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    movie: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    tVSeries: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    watchlistItem: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    favoriteItem: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    activityLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    rating: {
      count: jest.fn(),
    },
    comment: {
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {} as RedisService;
  const userId = '8a3c3f62-6805-4c4e-bdd0-516b8f318dc5';
  let usersService: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = new UsersService(prismaService, redisService);
    prismaService.user.findUnique = jest.fn().mockResolvedValue(createUser());
    prismaService.user.update = jest.fn().mockResolvedValue(createUser({
      displayName: 'Updated User',
    }));
    prismaService.refreshToken.deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    prismaService.movie.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.tVSeries.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.watchlistItem.findFirst = jest.fn().mockResolvedValue(null);
    prismaService.watchlistItem.create = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.watchlistItem.delete = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.favoriteItem.findFirst = jest.fn().mockResolvedValue(null);
    prismaService.favoriteItem.create = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.favoriteItem.delete = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.activityLog.create = jest.fn().mockResolvedValue({ id: 1 });
    prismaService.movie.findMany = jest.fn().mockResolvedValue([
      createMovie(),
    ]);
    prismaService.tVSeries.findMany = jest.fn().mockResolvedValue([
      createSeries(),
    ]);
    prismaService.rating.count = jest.fn().mockResolvedValue(3);
    prismaService.comment.count = jest.fn().mockResolvedValue(2);
  });

  function createUser(overrides: Record<string, unknown> = {}) {
    return {
      id: userId,
      email: 'user@example.com',
      passwordHash: '$2b$10$hash',
      displayName: 'Test User',
      avatarUrl: null,
      bio: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      language: 'vi',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    };
  }

  function createMovie() {
    return {
      id: 1,
      title: 'Movie',
      posterUrl: 'poster.jpg',
      releaseDate: new Date('2025-01-01T00:00:00.000Z'),
      voteAverage: 8.2,
      voteCount: 10,
    };
  }

  function createSeries() {
    return {
      id: 1,
      title: 'Series',
      posterUrl: 'poster.jpg',
      firstAirDate: new Date('2024-01-01T00:00:00.000Z'),
      voteAverage: 7.5,
      voteCount: 9,
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

  it('gets current user profile', async () => {
    const result = await usersService.getCurrentUser(userId);

    expect(result.id).toBe(userId);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
      }),
    );
  });

  it('updates current user profile and logs activity', async () => {
    const result = await usersService.updateCurrentUser(userId, {
      displayName: 'Updated User',
      bio: 'Hello',
      avatarUrl: 'https://example.com/avatar.jpg',
      language: 'en',
    });

    expect(result.displayName).toBe('Updated User');
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PROFILE_UPDATE',
        }),
      }),
    );
  });

  it('changes password when old password is correct and deletes refresh tokens', async () => {
    const passwordHash = await bcrypt.hash('Old@1234', 4);
    prismaService.user.findUnique = jest.fn().mockResolvedValue({
      id: userId,
      passwordHash,
    });
    prismaService.$transaction = jest.fn().mockResolvedValue([
      createUser(),
      { count: 2 },
    ]);

    const result = await usersService.changePassword(userId, {
      oldPassword: 'Old@1234',
      newPassword: 'Newer@1234',
    });

    expect(result.message).toBe('Password changed successfully.');
    expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CHANGE_PASSWORD',
        }),
      }),
    );
  });

  it('rejects password change with wrong old password', async () => {
    const passwordHash = await bcrypt.hash('Old@1234', 4);
    prismaService.user.findUnique = jest.fn().mockResolvedValue({
      id: userId,
      passwordHash,
    });

    await expectHttpStatus(
      usersService.changePassword(userId, {
        oldPassword: 'Wrong@1234',
        newPassword: 'Newer@1234',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects weak password at DTO validation level', async () => {
    const dto = new ChangeUserPasswordDto();
    dto.oldPassword = 'Old@1234';
    dto.newPassword = 'weak';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('toggles movie watchlist add, remove, and add again', async () => {
    const added = await usersService.toggleMovieWatchlist(userId, 1);

    prismaService.watchlistItem.findFirst = jest.fn().mockResolvedValue({ id: 1 });
    const removed = await usersService.toggleMovieWatchlist(userId, 1);

    prismaService.watchlistItem.findFirst = jest.fn().mockResolvedValue(null);
    const addedAgain = await usersService.toggleMovieWatchlist(userId, 1);

    expect(added.added).toBe(true);
    expect(removed.added).toBe(false);
    expect(addedAgain.added).toBe(true);
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'WATCHLIST_ADD',
          entityType: 'MOVIE',
        }),
      }),
    );
  });

  it('toggles TV watchlist and supports explicit remove', async () => {
    prismaService.watchlistItem.findFirst = jest.fn().mockResolvedValue(null);
    const added = await usersService.toggleSeriesWatchlist(userId, 1);

    prismaService.watchlistItem.findFirst = jest.fn().mockResolvedValue({ id: 2 });
    const removed = await usersService.removeSeriesWatchlist(userId, 1);

    expect(added.added).toBe(true);
    expect(removed.message).toBe('Watchlist item removed successfully.');
  });

  it('toggles favorites for movie and TV', async () => {
    const movieFavorite = await usersService.toggleMovieFavorite(userId, 1);
    const seriesFavorite = await usersService.toggleSeriesFavorite(userId, 1);

    expect(movieFavorite.added).toBe(true);
    expect(seriesFavorite.added).toBe(true);
    expect(prismaService.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'FAVORITE_ADD',
        }),
      }),
    );
  });

  it('gets watchlist and favorites with media info', async () => {
    const item = {
      id: 1,
      addedAt: new Date('2026-01-01T00:00:00.000Z'),
      movie: createMovie(),
      series: null,
    };
    prismaService.$transaction = jest.fn().mockResolvedValue([1, [item]]);

    const watchlist = await usersService.getWatchlist(userId, {
      page: 1,
      limit: 20,
    });
    const favorites = await usersService.getFavorites(userId, {
      page: 1,
      limit: 20,
    });

    expect(watchlist.data[0].movie?.year).toBe(2025);
    expect(favorites.meta.total).toBe(1);
  });

  it('gets activity and attaches movie and TV info', async () => {
    prismaService.$transaction = jest.fn().mockResolvedValue([
      2,
      [
        {
          id: 1,
          action: 'WATCHLIST_ADD',
          entityType: 'MOVIE',
          entityId: 1,
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 2,
          action: 'FAVORITE_ADD',
          entityType: 'TV',
          entityId: 1,
          metadata: null,
          createdAt: new Date(),
        },
      ],
    ]);

    const result = await usersService.getActivity(userId, {
      page: 1,
      limit: 20,
    });

    expect(result.data[0].entity?.title).toBe('Movie');
    expect(result.data[1].entity?.title).toBe('Series');
  });

  it('gets public profile with stats', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(createUser());
    prismaService.rating.count = jest.fn().mockResolvedValue(3);
    prismaService.comment.count = jest.fn().mockResolvedValue(2);

    const result = await usersService.getPublicProfile(userId);

    expect(result.stats).toEqual({
      totalRatings: 3,
      totalComments: 2,
    });
    expect(prismaService.comment.count).toHaveBeenCalledWith({
      where: {
        userId,
        status: CommentStatus.ACTIVE,
      },
    });
  });
});
