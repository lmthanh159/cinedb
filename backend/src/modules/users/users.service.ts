import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  CommentStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { ChangeUserPasswordDto } from '@/modules/users/dto/change-user-password.dto';
import type { LockUserDto } from '@/modules/users/dto/lock-user.dto';
import type { QueryActivityDto } from '@/modules/users/dto/query-activity.dto';
import type { QueryAdminUsersDto } from '@/modules/users/dto/query-admin-users.dto';
import type { QueryUserListDto } from '@/modules/users/dto/query-user-list.dto';
import type { UpdateAdminUserDto } from '@/modules/users/dto/update-admin-user.dto';
import type { UpdateUserProfileDto } from '@/modules/users/dto/update-user-profile.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type CollectionKind = 'watchlist' | 'favorite';
type MediaKind = 'movie' | 'series';
type MovieCollectionMedia = {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseDate: Date | null;
  voteAverage: number;
  voteCount: number;
};
type SeriesCollectionMedia = {
  id: number;
  title: string;
  posterUrl: string | null;
  firstAirDate: Date | null;
  voteAverage: number;
  voteCount: number;
};
type CollectionItemRaw = {
  id: number;
  addedAt: Date;
  movie: MovieCollectionMedia | null;
  series: SeriesCollectionMedia | null;
};

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: this.profileSelect(),
    });

    if (!user) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'User not found.', 'Not Found');
    }

    return user;
  }

  async updateCurrentUser(userId: string, dto: UpdateUserProfileDto) {
    await this.ensureUserExists(userId);

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() || null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl.trim() || null } : {}),
        ...(dto.language !== undefined ? { language: dto.language.trim() } : {}),
      },
      select: this.profileSelect(),
    });

    await this.logActivity(userId, 'PROFILE_UPDATE', 'USER', undefined, {
      fields: Object.keys(dto),
    });

    return user;
  }

  async changePassword(userId: string, dto: ChangeUserPasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Password change is not available for this account.',
        'Bad Request',
      );
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Current password is incorrect.',
        'Bad Request',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prismaService.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    await this.logActivity(userId, 'CHANGE_PASSWORD', 'USER');

    return {
      message: 'Password changed successfully.',
    };
  }

  async getWatchlist(userId: string, query: QueryUserListDto) {
    return this.getCollection(userId, query, 'watchlist');
  }

  async toggleMovieWatchlist(userId: string, movieId: number) {
    return this.toggleCollection(userId, movieId, 'movie', 'watchlist');
  }

  async toggleSeriesWatchlist(userId: string, seriesId: number) {
    return this.toggleCollection(userId, seriesId, 'series', 'watchlist');
  }

  async removeMovieWatchlist(userId: string, movieId: number) {
    return this.removeCollection(userId, movieId, 'movie', 'watchlist');
  }

  async removeSeriesWatchlist(userId: string, seriesId: number) {
    return this.removeCollection(userId, seriesId, 'series', 'watchlist');
  }

  async getFavorites(userId: string, query: QueryUserListDto) {
    return this.getCollection(userId, query, 'favorite');
  }

  async toggleMovieFavorite(userId: string, movieId: number) {
    return this.toggleCollection(userId, movieId, 'movie', 'favorite');
  }

  async toggleSeriesFavorite(userId: string, seriesId: number) {
    return this.toggleCollection(userId, seriesId, 'series', 'favorite');
  }

  async removeMovieFavorite(userId: string, movieId: number) {
    return this.removeCollection(userId, movieId, 'movie', 'favorite');
  }

  async removeSeriesFavorite(userId: string, seriesId: number) {
    return this.removeCollection(userId, seriesId, 'series', 'favorite');
  }

  async getActivity(userId: string, query: QueryActivityDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ActivityLogWhereInput = {
      userId,
      ...(query.type ? { action: query.type } : {}),
    };

    const [total, logs] = await this.prismaService.$transaction([
      this.prismaService.activityLog.count({ where }),
      this.prismaService.activityLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    const enrichedLogs = await this.attachActivityEntities(logs);

    return {
      data: enrichedLogs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getPublicProfile(userId: string) {
    const [user, totalRatings, totalComments] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
        },
      }),
      this.prismaService.rating.count({
        where: { userId },
      }),
      this.prismaService.comment.count({
        where: {
          userId,
          status: CommentStatus.ACTIVE,
        },
      }),
    ]);

    if (!user) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'User not found.', 'Not Found');
    }

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      memberSince: user.createdAt,
      stats: {
        totalRatings,
        totalComments,
      },
    };
  }

  async getAdminUsers(query: QueryAdminUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildAdminUserWhere(query);

    const [total, users] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        select: this.adminUserSelect(),
      }),
    ]);

    return {
      data: users.map((user) => this.serializeAdminUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateAdminUser(actorId: string, userId: string, dto: UpdateAdminUserDto) {
    const user = await this.ensureAdminTargetUser(userId);

    if (actorId === userId && dto.role && dto.role !== UserRole.ADMIN) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Admin cannot remove their own admin role.',
        'Bad Request',
      );
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
      ...(dto.bio !== undefined ? { bio: dto.bio.trim() || null } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl.trim() || null } : {}),
      ...(dto.language !== undefined ? { language: dto.language.trim() } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.emailVerified !== undefined ? { emailVerified: dto.emailVerified } : {}),
    };

    if (dto.status === UserStatus.ACTIVE || dto.status === UserStatus.UNVERIFIED) {
      data.lockedUntil = null;
      data.loginAttempts = 0;
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data,
      select: this.adminUserSelect(),
    });

    await Promise.all([
      this.redisService.del(this.getLoginAttemptsKey(user.email)),
      this.logAdminUserActivity(actorId, 'ADMIN_USER_UPDATE', user.id, {
        fields: Object.keys(dto),
      }),
    ]);

    return this.serializeAdminUser(updatedUser);
  }

  async lockAdminUser(actorId: string, userId: string, dto: LockUserDto) {
    if (actorId === userId) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Admin cannot lock their own account.',
        'Bad Request',
      );
    }

    const user = await this.ensureAdminTargetUser(userId);
    const minutes = dto.minutes ?? 30;
    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.LOCKED,
        lockedUntil,
        loginAttempts: 0,
      },
      select: this.adminUserSelect(),
    });

    await Promise.all([
      this.prismaService.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.redisService.del(this.getLoginAttemptsKey(user.email)),
      this.logAdminUserActivity(actorId, 'ADMIN_USER_LOCK', user.id, {
        minutes,
        ...(dto.reason?.trim() ? { reason: dto.reason.trim() } : {}),
      }),
    ]);

    return this.serializeAdminUser(updatedUser);
  }

  async unlockAdminUser(actorId: string, userId: string) {
    const user = await this.ensureAdminTargetUser(userId);
    const nextStatus = user.emailVerified ? UserStatus.ACTIVE : UserStatus.UNVERIFIED;
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        status: nextStatus,
        lockedUntil: null,
        loginAttempts: 0,
      },
      select: this.adminUserSelect(),
    });

    await Promise.all([
      this.redisService.del(this.getLoginAttemptsKey(user.email)),
      this.logAdminUserActivity(actorId, 'ADMIN_USER_UNLOCK', user.id),
    ]);

    return this.serializeAdminUser(updatedUser);
  }

  async getAdminStats() {
    const [totalUsers, totalRatings, totalComments] = await this.prismaService.$transaction([
      this.prismaService.user.count(),
      this.prismaService.rating.count(),
      this.prismaService.comment.count({
        where: {
          status: {
            not: CommentStatus.DELETED,
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalRatings,
      totalComments,
    };
  }

  private buildAdminUserWhere(query: QueryAdminUsersDto): Prisma.UserWhereInput {
    const search = query.q?.trim();

    return {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private adminUserSelect() {
    return {
      ...this.profileSelect(),
      loginAttempts: true,
      lockedUntil: true,
      _count: {
        select: {
          ratings: true,
          comments: true,
        },
      },
    } satisfies Prisma.UserSelect;
  }

  private serializeAdminUser(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    language: string;
    loginAttempts: number;
    lockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      ratings: number;
      comments: number;
    };
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      language: user.language,
      lockedUntil: user.lockedUntil,
      loginAttempts: user.loginAttempts,
      totalRatings: user._count.ratings,
      totalComments: user._count.comments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async ensureAdminTargetUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'User not found.', 'Not Found');
    }

    return user;
  }

  private async logAdminUserActivity(
    actorId: string,
    action: string,
    targetUserId: string,
    metadata: Record<string, Prisma.InputJsonValue> = {},
  ) {
    await this.logActivity(actorId, action, 'USER', undefined, {
      ...metadata,
      targetUserId,
    });
  }

  private getLoginAttemptsKey(email: string) {
    return `login_attempts:${email}`;
  }

  private async getCollection(
    userId: string,
    query: QueryUserListDto,
    collectionKind: CollectionKind,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, items] =
      collectionKind === 'watchlist'
        ? await this.prismaService.$transaction([
            this.prismaService.watchlistItem.count({
              where: { userId },
            }),
            this.prismaService.watchlistItem.findMany({
              where: { userId },
              orderBy: { addedAt: 'desc' },
              skip,
              take: limit,
              select: this.collectionSelect(),
            }),
          ])
        : await this.prismaService.$transaction([
            this.prismaService.favoriteItem.count({
              where: { userId },
            }),
            this.prismaService.favoriteItem.findMany({
              where: { userId },
              orderBy: { addedAt: 'desc' },
              skip,
              take: limit,
              select: this.collectionSelect(),
            }),
          ]);

    return {
      data: (items as CollectionItemRaw[]).map((item) =>
        this.serializeCollectionItem(item),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async toggleCollection(
    userId: string,
    entityId: number,
    mediaKind: MediaKind,
    collectionKind: CollectionKind,
  ) {
    await this.ensureMediaExists(entityId, mediaKind);

    const existingItem =
      collectionKind === 'watchlist'
        ? await this.prismaService.watchlistItem.findFirst({
            where: this.collectionWhere(userId, entityId, mediaKind),
            select: { id: true },
          })
        : await this.prismaService.favoriteItem.findFirst({
            where: this.collectionWhere(userId, entityId, mediaKind),
            select: { id: true },
          });

    if (existingItem) {
      if (collectionKind === 'watchlist') {
        await this.prismaService.watchlistItem.delete({
          where: { id: existingItem.id },
        });
      } else {
        await this.prismaService.favoriteItem.delete({
          where: { id: existingItem.id },
        });
      }
      await this.logCollectionActivity(userId, entityId, mediaKind, collectionKind, false);

      return {
        added: false,
      };
    }

    if (collectionKind === 'watchlist') {
      await this.prismaService.watchlistItem.create({
        data: {
          userId,
          ...(mediaKind === 'movie' ? { movieId: entityId } : { seriesId: entityId }),
        },
      });
    } else {
      await this.prismaService.favoriteItem.create({
        data: {
          userId,
          ...(mediaKind === 'movie' ? { movieId: entityId } : { seriesId: entityId }),
        },
      });
    }
    await this.logCollectionActivity(userId, entityId, mediaKind, collectionKind, true);

    return {
      added: true,
    };
  }

  private async removeCollection(
    userId: string,
    entityId: number,
    mediaKind: MediaKind,
    collectionKind: CollectionKind,
  ) {
    await this.ensureMediaExists(entityId, mediaKind);

    const existingItem =
      collectionKind === 'watchlist'
        ? await this.prismaService.watchlistItem.findFirst({
            where: this.collectionWhere(userId, entityId, mediaKind),
            select: { id: true },
          })
        : await this.prismaService.favoriteItem.findFirst({
            where: this.collectionWhere(userId, entityId, mediaKind),
            select: { id: true },
          });

    if (!existingItem) {
      return {
        message: `${this.capitalize(collectionKind)} item was not present.`,
      };
    }

    if (collectionKind === 'watchlist') {
      await this.prismaService.watchlistItem.delete({
        where: { id: existingItem.id },
      });
    } else {
      await this.prismaService.favoriteItem.delete({
        where: { id: existingItem.id },
      });
    }
    await this.logCollectionActivity(userId, entityId, mediaKind, collectionKind, false);

    return {
      message: `${this.capitalize(collectionKind)} item removed successfully.`,
    };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw this.createHttpException(HttpStatus.NOT_FOUND, 'User not found.', 'Not Found');
    }
  }

  private async ensureMediaExists(entityId: number, mediaKind: MediaKind) {
    const media =
      mediaKind === 'movie'
        ? await this.prismaService.movie.findFirst({
            where: { id: entityId, isDeleted: false },
            select: { id: true },
          })
        : await this.prismaService.tVSeries.findFirst({
            where: { id: entityId, isDeleted: false },
            select: { id: true },
          });

    if (!media) {
      throw this.createHttpException(
        HttpStatus.NOT_FOUND,
        mediaKind === 'movie' ? 'Movie not found.' : 'TV series not found.',
        'Not Found',
      );
    }
  }

  private async attachActivityEntities(
    logs: Array<{
      id: number;
      action: string;
      entityType: string | null;
      entityId: number | null;
      metadata: Prisma.JsonValue;
      createdAt: Date;
    }>,
  ) {
    const movieIds = this.uniqueEntityIds(logs, 'MOVIE');
    const seriesIds = this.uniqueEntityIds(logs, 'TV');

    const [movies, series] = await Promise.all([
      movieIds.length > 0
        ? this.prismaService.movie.findMany({
            where: { id: { in: movieIds } },
            select: this.mediaSelect('movie'),
          })
        : Promise.resolve([]),
      seriesIds.length > 0
        ? this.prismaService.tVSeries.findMany({
            where: { id: { in: seriesIds } },
            select: this.mediaSelect('series'),
          })
        : Promise.resolve([]),
    ]);

    const movieById = new Map(movies.map((movie) => [movie.id, this.serializeMovie(movie)]));
    const seriesById = new Map(series.map((item) => [item.id, this.serializeSeries(item)]));

    return logs.map((log) => ({
      ...log,
      entity:
        log.entityType === 'MOVIE' && log.entityId
          ? movieById.get(log.entityId) ?? null
          : log.entityType === 'TV' && log.entityId
            ? seriesById.get(log.entityId) ?? null
            : null,
    }));
  }

  private uniqueEntityIds(
    logs: Array<{ entityType: string | null; entityId: number | null }>,
    entityType: 'MOVIE' | 'TV',
  ) {
    return [
      ...new Set(
        logs
          .filter((log) => log.entityType === entityType && log.entityId)
          .map((log) => log.entityId as number),
      ),
    ];
  }

  private collectionWhere(userId: string, entityId: number, mediaKind: MediaKind) {
    return {
      userId,
      ...(mediaKind === 'movie' ? { movieId: entityId } : { seriesId: entityId }),
    };
  }

  private collectionSelect() {
    return {
      id: true,
      addedAt: true,
      movie: {
        select: this.mediaSelect('movie'),
      },
      series: {
        select: this.mediaSelect('series'),
      },
    } satisfies Prisma.WatchlistItemSelect;
  }

  private mediaSelect(mediaKind: MediaKind) {
    return mediaKind === 'movie'
      ? {
          id: true,
          title: true,
          posterUrl: true,
          releaseDate: true,
          voteAverage: true,
          voteCount: true,
        }
      : {
          id: true,
          title: true,
          posterUrl: true,
          firstAirDate: true,
          voteAverage: true,
          voteCount: true,
        };
  }

  private serializeCollectionItem(item: CollectionItemRaw) {
    return {
      id: item.id,
      addedAt: item.addedAt,
      movie: item.movie ? this.serializeMovie(item.movie) : null,
      series: item.series ? this.serializeSeries(item.series) : null,
    };
  }

  private serializeMovie(movie: {
    id: number;
    title: string;
    posterUrl: string | null;
    releaseDate: Date | null;
    voteAverage: number;
    voteCount: number;
  }) {
    return {
      id: movie.id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      year: movie.releaseDate?.getFullYear() ?? null,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
    };
  }

  private serializeSeries(series: {
    id: number;
    title: string;
    posterUrl: string | null;
    firstAirDate: Date | null;
    voteAverage: number;
    voteCount: number;
  }) {
    return {
      id: series.id,
      title: series.title,
      posterUrl: series.posterUrl,
      year: series.firstAirDate?.getFullYear() ?? null,
      voteAverage: series.voteAverage,
      voteCount: series.voteCount,
    };
  }

  private async logCollectionActivity(
    userId: string,
    entityId: number,
    mediaKind: MediaKind,
    collectionKind: CollectionKind,
    added: boolean,
  ) {
    const actionPrefix = collectionKind === 'watchlist' ? 'WATCHLIST' : 'FAVORITE';
    await this.logActivity(
      userId,
      `${actionPrefix}_${added ? 'ADD' : 'REMOVE'}`,
      mediaKind === 'movie' ? 'MOVIE' : 'TV',
      entityId,
    );
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

  private profileSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      status: true,
      emailVerified: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.UserSelect;
  }

  private capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
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
