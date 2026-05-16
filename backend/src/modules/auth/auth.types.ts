import type { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: UserRole;
  jti?: string;
  exp?: number;
  iat?: number;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
  exp?: number;
  iat?: number;
};

export type ActionTokenPayload = {
  sub: string;
  email: string;
  exp?: number;
  iat?: number;
};

export type GoogleProfileUser = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  googleId: string;
};
