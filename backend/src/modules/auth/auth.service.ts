import { randomUUID } from 'node:crypto';

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

import {
  EMAIL_VERIFY_TOKEN_EXPIRY,
  LOGIN_ATTEMPTS_LIMIT,
  LOGIN_ATTEMPTS_TTL_SECONDS,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REGEX,
  PASSWORD_RESET_TOKEN_EXPIRY,
} from '@/modules/auth/auth.constants';
import type {
  ActionTokenPayload,
  AuthenticatedUser,
  GoogleProfileUser,
} from '@/modules/auth/auth.types';
import type { ChangePasswordDto } from '@/modules/auth/dto/change-password.dto';
import type { ForgotPasswordDto } from '@/modules/auth/dto/forgot-password.dto';
import type { LoginDto } from '@/modules/auth/dto/login.dto';
import type { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import type { RegisterDto } from '@/modules/auth/dto/register.dto';
import type { ResetPasswordDto } from '@/modules/auth/dto/reset-password.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    this.assertStrongPassword(dto.password);

    const email = this.normalizeEmail(dto.email);
    const displayName = dto.displayName.trim();
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw this.createHttpException(
        HttpStatus.CONFLICT,
        'Email is already registered.',
        'Conflict',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.prismaService.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        status: UserStatus.UNVERIFIED,
        emailVerified: false,
      },
    });

    const verificationToken = await this.createActionToken(
      user.email,
      'email-verify',
      EMAIL_VERIFY_TOKEN_EXPIRY,
    );

    this.logger.log(`Email verification token for ${user.email}: ${verificationToken}`);
    await this.logActivity(user.id, 'REGISTER', {
      provider: 'local',
    });

    return {
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const userRecord = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!userRecord || !userRecord.passwordHash) {
      throw this.createHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid email or password.',
        'Unauthorized',
      );
    }

    const user = await this.unlockUserIfNeeded(userRecord);
    this.assertAccountCanLogin(user);

    const attempts = await this.getLoginAttempts(email, user.loginAttempts);

    if (attempts >= LOGIN_ATTEMPTS_LIMIT) {
      const lockedUntil = await this.lockUser(user.id, email);
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        `Account locked, try after ${this.getRemainingLockMinutes(lockedUntil)} minutes.`,
        'Forbidden',
      );
    }

    const passwordHash = user.passwordHash;

    if (!passwordHash) {
      throw this.createHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid email or password.',
        'Unauthorized',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!isPasswordValid) {
      const nextAttempts = await this.redisService.increment(
        this.getLoginAttemptsKey(email),
        LOGIN_ATTEMPTS_TTL_SECONDS,
      );

      if (nextAttempts >= LOGIN_ATTEMPTS_LIMIT) {
        const lockedUntil = await this.lockUser(user.id, email);
        throw this.createHttpException(
          HttpStatus.FORBIDDEN,
          `Account locked, try after ${this.getRemainingLockMinutes(lockedUntil)} minutes.`,
          'Forbidden',
        );
      }

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: nextAttempts,
        },
      });

      throw this.createHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid email or password.',
        'Unauthorized',
      );
    }

    await this.redisService.del(this.getLoginAttemptsKey(email));
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    const tokens = await this.generateTokens(user);

    await this.logActivity(user.id, 'LOGIN', {
      provider: 'local',
    });

    return {
      ...tokens,
      user: this.mapUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshTokenRecord = await this.prismaService.refreshToken.findUnique({
      where: {
        token: dto.refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!refreshTokenRecord) {
      throw this.createHttpException(
        HttpStatus.UNAUTHORIZED,
        'Invalid refresh token.',
        'Unauthorized',
      );
    }

    if (refreshTokenRecord.expiresAt.getTime() <= Date.now()) {
      await this.prismaService.refreshToken.deleteMany({
        where: {
          token: dto.refreshToken,
        },
      });

      throw this.createHttpException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token has expired.',
        'Unauthorized',
      );
    }

    const user = await this.unlockUserIfNeeded(refreshTokenRecord.user);

    if (user.status !== UserStatus.ACTIVE) {
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        'User account is not active.',
        'Forbidden',
      );
    }

    return {
      accessToken: await this.generateAccessToken(user),
    };
  }

  async logout(currentUser: AuthenticatedUser, refreshToken?: string) {
    const remainingTokenLifetime = currentUser.exp
      ? Math.max(currentUser.exp - Math.floor(Date.now() / 1000), 1)
      : LOGIN_ATTEMPTS_TTL_SECONDS;

    if (currentUser.jti) {
      await this.redisService.set(
        `blacklist:token:${currentUser.jti}`,
        '1',
        remainingTokenLifetime,
      );
    }

    if (refreshToken) {
      await this.prismaService.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: currentUser.userId,
        },
      });
    }

    await this.logActivity(currentUser.userId, 'LOGOUT');

    return {
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (user) {
      const resetToken = await this.createActionToken(
        email,
        'password-reset',
        PASSWORD_RESET_TOKEN_EXPIRY,
      );

      this.logger.log(`Password reset token for ${email}: ${resetToken}`);
    }

    return {
      message: 'If email exists, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.assertStrongPassword(dto.newPassword);

    const payload = await this.verifyActionToken(dto.token, 'password-reset');
    const user = await this.prismaService.user.findUnique({
      where: {
        email: this.normalizeEmail(payload.email),
      },
    });

    if (!user) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Invalid reset token.',
        'Bad Request',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockedUntil: null,
        status: user.emailVerified ? UserStatus.ACTIVE : user.status,
      },
    });
    await this.prismaService.refreshToken.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await this.redisService.del(this.getLoginAttemptsKey(user.email));

    await this.logActivity(user.id, 'RESET_PASSWORD');

    return {
      message: 'Password reset successful.',
    };
  }

  async verifyEmail(token: string) {
    const payload = await this.verifyActionToken(token, 'email-verify');
    const user = await this.prismaService.user.findUnique({
      where: {
        email: this.normalizeEmail(payload.email),
      },
    });

    if (!user) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Invalid verification token.',
        'Bad Request',
      );
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.redisService.del(this.getLoginAttemptsKey(user.email));

    await this.logActivity(user.id, 'VERIFY_EMAIL');

    return {
      message: 'Email verified successfully.',
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw this.createHttpException(
        HttpStatus.NOT_FOUND,
        'User not found.',
        'Not Found',
      );
    }

    return user;
  }

  async changePassword(currentUser: AuthenticatedUser, dto: ChangePasswordDto) {
    this.assertStrongPassword(dto.newPassword);

    const user = await this.prismaService.user.findUnique({
      where: { id: currentUser.userId },
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

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
      },
    });
    await this.prismaService.refreshToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await this.logActivity(user.id, 'CHANGE_PASSWORD');

    return {
      message: 'Password changed successfully.',
    };
  }

  async handleGoogleCallback(profile: GoogleProfileUser) {
    const email = this.normalizeEmail(profile.email);
    let user = await this.prismaService.user.findFirst({
      where: {
        oauthProvider: 'google',
        oauthId: profile.googleId,
      },
    });

    if (!user) {
      const existingEmailUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!existingEmailUser) {
        user = await this.prismaService.user.create({
          data: {
            email,
            displayName: profile.displayName.trim(),
            avatarUrl: profile.avatarUrl,
            oauthProvider: 'google',
            oauthId: profile.googleId,
            status: UserStatus.ACTIVE,
            emailVerified: true,
          },
        });
      } else {
        user = await this.prismaService.user.update({
          where: {
            id: existingEmailUser.id,
          },
          data: {
            displayName: existingEmailUser.displayName || profile.displayName.trim(),
            avatarUrl: existingEmailUser.avatarUrl ?? profile.avatarUrl,
            oauthProvider: 'google',
            oauthId: profile.googleId,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            loginAttempts: 0,
            lockedUntil: null,
          },
        });
      }
    }

    const tokens = await this.generateTokens(user);
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const redirectUrl = new URL('/auth/callback', frontendUrl);

    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

    await this.logActivity(user.id, 'LOGIN', {
      provider: 'google',
    });

    return {
      redirectUrl: redirectUrl.toString(),
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private assertStrongPassword(password: string) {
    if (!PASSWORD_REGEX.test(password)) {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        PASSWORD_POLICY_MESSAGE,
        'Bad Request',
      );
    }
  }

  private createHttpException(
    statusCode: HttpStatus,
    message: string,
    error: string,
  ) {
    return new HttpException(
      {
        statusCode,
        message,
        error,
      },
      statusCode,
    );
  }

  private async createActionToken(
    email: string,
    subject: 'email-verify' | 'password-reset',
    expiresIn: string,
  ) {
    return this.jwtService.signAsync(
      {
        email,
      },
      {
        subject,
        expiresIn: expiresIn as StringValue,
        secret: this.getAccessSecret(),
      } as const,
    );
  }

  private async verifyActionToken(
    token: string,
    expectedSubject: 'email-verify' | 'password-reset',
  ) {
    try {
      const payload = await this.jwtService.verifyAsync<ActionTokenPayload>(token, {
        secret: this.getAccessSecret(),
      });

      if (payload.sub !== expectedSubject) {
        throw new Error('Invalid token subject');
      }

      return payload;
    } catch {
      throw this.createHttpException(
        HttpStatus.BAD_REQUEST,
        'Invalid or expired token.',
        'Bad Request',
      );
    }
  }

  private async generateTokens(user: User) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = randomUUID();

    await this.prismaService.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(
          Date.now() + this.parseDurationToMs(this.getRefreshExpiry()),
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(user: User) {
    return this.jwtService.signAsync(
      {
        email: user.email,
        role: user.role,
        jti: randomUUID(),
      },
      {
        subject: user.id,
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRY',
          '15m',
        ) as StringValue,
        secret: this.getAccessSecret(),
      } as const,
    );
  }

  private getAccessSecret() {
    return this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'cinedb-access-secret-change-in-production-min-32-chars',
    );
  }

  private getRefreshExpiry() {
    return this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
  }

  private parseDurationToMs(value: string) {
    const parsedValue = value.trim().match(/^(\d+)([smhd])$/i);

    if (!parsedValue) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(parsedValue[1]);
    const unit = parsedValue[2].toLowerCase();

    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private mapUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }

  private getLoginAttemptsKey(email: string) {
    return `login_attempts:${email}`;
  }

  private async getLoginAttempts(email: string, fallback = 0) {
    const attempts = await this.redisService.get<number | string>(
      this.getLoginAttemptsKey(email),
    );

    if (attempts === null) {
      return fallback;
    }

    return typeof attempts === 'number' ? attempts : Number(attempts);
  }

  private assertAccountCanLogin(user: User) {
    if (user.status === UserStatus.UNVERIFIED) {
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        'Please verify your email before logging in.',
        'Forbidden',
      );
    }

    if (
      user.status === UserStatus.LOCKED &&
      user.lockedUntil &&
      user.lockedUntil.getTime() > Date.now()
    ) {
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        `Account locked, try after ${this.getRemainingLockMinutes(user.lockedUntil)} minutes.`,
        'Forbidden',
      );
    }
  }

  private async unlockUserIfNeeded(user: User) {
    if (
      user.status === UserStatus.LOCKED &&
      user.lockedUntil &&
      user.lockedUntil.getTime() <= Date.now()
    ) {
      await this.redisService.del(this.getLoginAttemptsKey(user.email));

      return this.prismaService.user.update({
        where: { id: user.id },
        data: {
          status: user.emailVerified ? UserStatus.ACTIVE : UserStatus.UNVERIFIED,
          loginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    return user;
  }

  private async lockUser(userId: string, email: string) {
    const lockedUntil = new Date(Date.now() + LOGIN_ATTEMPTS_TTL_SECONDS * 1000);

    await this.redisService.set(
      this.getLoginAttemptsKey(email),
      LOGIN_ATTEMPTS_LIMIT,
      LOGIN_ATTEMPTS_TTL_SECONDS,
    );
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.LOCKED,
        lockedUntil,
        loginAttempts: LOGIN_ATTEMPTS_LIMIT,
      },
    });

    return lockedUntil;
  }

  private getRemainingLockMinutes(lockedUntil: Date) {
    return Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / (60 * 1000)),
    );
  }

  private async logActivity(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prismaService.activityLog.create({
        data: {
          userId,
          action,
          entityType: 'AUTH',
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log activity "${action}" for user ${userId}: ${String(error)}`,
      );
    }
  }
}
