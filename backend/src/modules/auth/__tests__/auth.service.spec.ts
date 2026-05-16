import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from '@/modules/auth/auth.service';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('AuthService', () => {
  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'unit-test-access-secret',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    FRONTEND_URL: 'http://localhost:3000',
  };

  const prismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    increment: jest.fn(),
  } as unknown as RedisService;

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const configService = {
    get: jest.fn((key: string, defaultValue?: string) => configValues[key] ?? defaultValue),
  };

  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(
      prismaService,
      redisService,
      jwtService,
      configService as never,
    );
  });

  async function hashPassword(password: string) {
    return bcrypt.hash(password, 4);
  }

  function createUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'user-1',
      email: 'admin@cinedb.com',
      passwordHash: '$2b$04$placeholder',
      displayName: 'Admin User',
      avatarUrl: null,
      bio: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      oauthProvider: null,
      oauthId: null,
      language: 'vi',
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  async function expectHttpStatus(
    promise: Promise<unknown>,
    status: HttpStatus,
  ) {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
    }
  }

  it('registers a user successfully', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
    prismaService.user.create = jest.fn().mockResolvedValue(
      createUser({
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      }),
    );
    jwtService.signAsync = jest.fn().mockResolvedValue('verify-token');

    const result = await authService.register({
      email: 'User@Example.com',
      password: 'Test@123456',
      displayName: 'Test User',
    });

    expect(result.message).toContain('Registration successful');
    expect(prismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@example.com',
          status: UserStatus.UNVERIFIED,
        }),
      }),
    );
  });

  it('rejects duplicate email registration', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(createUser());

    await expectHttpStatus(
      authService.register({
        email: 'admin@cinedb.com',
        password: 'Test@123456',
        displayName: 'Admin',
      }),
      HttpStatus.CONFLICT,
    );
  });

  it('rejects weak passwords during registration', async () => {
    await expectHttpStatus(
      authService.register({
        email: 'user@example.com',
        password: 'weakpass',
        displayName: 'Weak User',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('logs in successfully', async () => {
    const passwordHash = await hashPassword('Admin@123');
    const user = createUser({
      passwordHash,
      role: UserRole.ADMIN,
    });

    prismaService.user.findUnique = jest.fn().mockResolvedValue(user);
    prismaService.user.update = jest.fn().mockResolvedValue(user);
    prismaService.refreshToken.create = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    jwtService.signAsync = jest
      .fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('ignored-second-sign');

    const result = await authService.login({
      email: 'admin@cinedb.com',
      password: 'Admin@123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.user.email).toBe('admin@cinedb.com');
    expect(redisService.del).toHaveBeenCalled();
  });

  it('rejects wrong password', async () => {
    const passwordHash = await hashPassword('Admin@123');

    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash,
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.increment = jest.fn().mockResolvedValue(1);

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Wrong@123',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('rejects login when user does not exist', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.login({
        email: 'missing@cinedb.com',
        password: 'Whatever@123',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('rejects login when unlocked account no longer has a password hash', async () => {
    const expiredLockedUser = createUser({
      passwordHash: 'still-present',
      status: UserStatus.LOCKED,
      lockedUntil: new Date(Date.now() - 60_000),
    });

    prismaService.user.findUnique = jest.fn().mockResolvedValue(expiredLockedUser);
    prismaService.user.update = jest.fn().mockResolvedValue(
      createUser({
        passwordHash: null,
        status: UserStatus.ACTIVE,
        lockedUntil: null,
      }),
    );
    redisService.del = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Admin@123',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('rejects locked accounts', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        status: UserStatus.LOCKED,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      }),
    );

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Admin@123',
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it('rejects unverified accounts', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      }),
    );

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Admin@123',
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it('locks immediately when cached attempts already hit the limit', async () => {
    const passwordHash = await hashPassword('Admin@123');

    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash,
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(5);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Admin@123',
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it('locks account after five failed attempts', async () => {
    const passwordHash = await hashPassword('Admin@123');

    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash,
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(4);
    redisService.increment = jest.fn().mockResolvedValue(5);
    redisService.set = jest.fn().mockResolvedValue(undefined);

    await expectHttpStatus(
      authService.login({
        email: 'admin@cinedb.com',
        password: 'Wrong@123',
      }),
      HttpStatus.FORBIDDEN,
    );

    expect(prismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UserStatus.LOCKED,
          loginAttempts: 5,
        }),
      }),
    );
  });

  it('unlocks expired lock and logs in successfully', async () => {
    const passwordHash = await hashPassword('Admin@123');
    const expiredLockedUser = createUser({
      passwordHash,
      status: UserStatus.LOCKED,
      lockedUntil: new Date(Date.now() - 60_000),
    });
    const unlockedUser = createUser({
      passwordHash,
      status: UserStatus.ACTIVE,
      lockedUntil: null,
      loginAttempts: 0,
    });

    prismaService.user.findUnique = jest.fn().mockResolvedValue(expiredLockedUser);
    prismaService.user.update = jest
      .fn()
      .mockResolvedValueOnce(unlockedUser)
      .mockResolvedValueOnce(unlockedUser);
    prismaService.refreshToken.create = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    redisService.get = jest.fn().mockResolvedValue(null);
    redisService.del = jest.fn().mockResolvedValue(undefined);
    jwtService.signAsync = jest.fn().mockResolvedValue('access-token');

    const result = await authService.login({
      email: 'admin@cinedb.com',
      password: 'Admin@123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(redisService.del).toHaveBeenCalledWith('login_attempts:admin@cinedb.com');
  });

  it('refreshes access token successfully', async () => {
    prismaService.refreshToken.findUnique = jest.fn().mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: createUser(),
    });
    jwtService.signAsync = jest.fn().mockResolvedValue('new-access-token');

    const result = await authService.refresh({
      refreshToken: 'refresh-token',
    });

    expect(result.accessToken).toBe('new-access-token');
  });

  it('rejects expired refresh token', async () => {
    prismaService.refreshToken.findUnique = jest.fn().mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date(Date.now() - 1000),
      user: createUser(),
    });
    prismaService.refreshToken.deleteMany = jest.fn().mockResolvedValue(undefined);

    await expectHttpStatus(
      authService.refresh({
        refreshToken: 'refresh-token',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('rejects invalid refresh token', async () => {
    prismaService.refreshToken.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.refresh({
        refreshToken: 'refresh-token',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('rejects refresh when user is not active', async () => {
    prismaService.refreshToken.findUnique = jest.fn().mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: createUser({
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      }),
    });

    await expectHttpStatus(
      authService.refresh({
        refreshToken: 'refresh-token',
      }),
      HttpStatus.FORBIDDEN,
    );
  });

  it('blacklists token on logout', async () => {
    redisService.set = jest.fn().mockResolvedValue(undefined);
    prismaService.refreshToken.deleteMany = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);

    const result = await authService.logout(
      {
        userId: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        jti: 'token-jti',
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      'refresh-token',
    );

    expect(result.message).toBe('Logged out successfully');
    expect(redisService.set).toHaveBeenCalledWith(
      'blacklist:token:token-jti',
      '1',
      expect.any(Number),
    );
  });

  it('sends forgot password response when email exists', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(createUser());
    jwtService.signAsync = jest.fn().mockResolvedValue('reset-token');

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    expect(result.message).toContain('If email exists');
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  it('continues registration when activity logging fails', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
    prismaService.user.create = jest.fn().mockResolvedValue(
      createUser({
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      }),
    );
    prismaService.activityLog.create = jest.fn().mockRejectedValue(new Error('db down'));
    jwtService.signAsync = jest.fn().mockResolvedValue('verify-token');

    const result = await authService.register({
      email: 'recover@example.com',
      password: 'Recover@123',
      displayName: 'Recover User',
    });

    expect(result.message).toContain('Registration successful');
  });

  it('sends forgot password response when email does not exist', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

    const result = await authService.forgotPassword({
      email: 'missing@example.com',
    });

    expect(result.message).toContain('If email exists');
  });

  it('changes password successfully', async () => {
    const oldPasswordHash = await hashPassword('Old@123456');

    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash: oldPasswordHash,
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    prismaService.refreshToken.deleteMany = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);

    const result = await authService.changePassword(
      {
        userId: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
      } as AuthenticatedUser,
      {
        oldPassword: 'Old@123456',
        newPassword: 'Newer@123456',
      },
    );

    expect(result.message).toBe('Password changed successfully.');
  });

  it('rejects password change when old password is wrong', async () => {
    const oldPasswordHash = await hashPassword('Old@123456');

    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash: oldPasswordHash,
      }),
    );

    await expectHttpStatus(
      authService.changePassword(
        {
          userId: 'user-1',
          email: 'user@example.com',
          role: UserRole.USER,
        } as AuthenticatedUser,
        {
          oldPassword: 'Wrong@123456',
          newPassword: 'Newer@123456',
        },
      ),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects password change for oauth-only accounts', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        passwordHash: null,
      }),
    );

    await expectHttpStatus(
      authService.changePassword(
        {
          userId: 'user-1',
          email: 'user@example.com',
          role: UserRole.USER,
        } as AuthenticatedUser,
        {
          oldPassword: 'Old@123456',
          newPassword: 'Newer@123456',
        },
      ),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('resets password successfully', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'password-reset',
      email: 'user@example.com',
    });
    prismaService.user.findUnique = jest.fn().mockResolvedValue(createUser());
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    prismaService.refreshToken.deleteMany = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);

    const result = await authService.resetPassword({
      token: 'reset-token',
      newPassword: 'Reset@123456',
    });

    expect(result.message).toBe('Password reset successful.');
  });

  it('rejects reset password when token is invalid', async () => {
    jwtService.verifyAsync = jest.fn().mockRejectedValue(new Error('invalid'));

    await expectHttpStatus(
      authService.resetPassword({
        token: 'invalid-token',
        newPassword: 'Reset@123456',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects reset password when token user does not exist', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'password-reset',
      email: 'missing@example.com',
    });
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.resetPassword({
        token: 'reset-token',
        newPassword: 'Reset@123456',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('verifies email successfully', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'email-verify',
      email: 'user@example.com',
    });
    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    redisService.del = jest.fn().mockResolvedValue(undefined);

    const result = await authService.verifyEmail('verify-token');

    expect(result.message).toBe('Email verified successfully.');
  });

  it('rejects verify email when user does not exist', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'email-verify',
      email: 'missing@example.com',
    });
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.verifyEmail('verify-token'),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects verify email when token subject is invalid', async () => {
    jwtService.verifyAsync = jest.fn().mockResolvedValue({
      sub: 'password-reset',
      email: 'user@example.com',
    });

    await expectHttpStatus(
      authService.verifyEmail('verify-token'),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('gets the current user', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Current User',
      role: UserRole.USER,
      avatarUrl: null,
    });

    const result = await authService.getCurrentUser('user-1');

    expect(result.email).toBe('user@example.com');
  });

  it('throws when current user is missing', async () => {
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

    await expectHttpStatus(
      authService.getCurrentUser('missing-user'),
      HttpStatus.NOT_FOUND,
    );
  });

  it('creates a new account from google callback', async () => {
    prismaService.user.findFirst = jest.fn().mockResolvedValue(null);
    prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
    prismaService.user.create = jest.fn().mockResolvedValue(
      createUser({
        email: 'google@example.com',
        displayName: 'Google User',
        oauthProvider: 'google',
        oauthId: 'google-1',
      }),
    );
    prismaService.refreshToken.create = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    jwtService.signAsync = jest.fn().mockResolvedValue('google-access-token');

    const result = await authService.handleGoogleCallback({
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: 'https://example.com/google.jpg',
      googleId: 'google-1',
    });

    expect(result.redirectUrl).toContain('accessToken=google-access-token');
    expect(prismaService.user.create).toHaveBeenCalled();
  });

  it('links an existing account from google callback', async () => {
    prismaService.user.findFirst = jest.fn().mockResolvedValue(null);
    prismaService.user.findUnique = jest.fn().mockResolvedValue(
      createUser({
        email: 'existing@example.com',
        displayName: 'Existing User',
      }),
    );
    prismaService.user.update = jest.fn().mockResolvedValue(
      createUser({
        email: 'existing@example.com',
        displayName: 'Existing User',
        oauthProvider: 'google',
        oauthId: 'google-2',
      }),
    );
    prismaService.refreshToken.create = jest.fn().mockResolvedValue(undefined);
    prismaService.activityLog.create = jest.fn().mockResolvedValue(undefined);
    jwtService.signAsync = jest.fn().mockResolvedValue('linked-access-token');

    const result = await authService.handleGoogleCallback({
      email: 'existing@example.com',
      displayName: 'Existing User',
      avatarUrl: null,
      googleId: 'google-2',
    });

    expect(result.redirectUrl).toContain('refreshToken=');
    expect(prismaService.user.update).toHaveBeenCalled();
  });

  it('parses supported duration formats and falls back for invalid input', () => {
    const parseDurationToMs = (
      authService as unknown as {
        parseDurationToMs: (value: string) => number;
      }
    ).parseDurationToMs.bind(authService);

    expect(parseDurationToMs('10s')).toBe(10_000);
    expect(parseDurationToMs('15m')).toBe(900_000);
    expect(parseDurationToMs('2h')).toBe(7_200_000);
    expect(parseDurationToMs('forever')).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
