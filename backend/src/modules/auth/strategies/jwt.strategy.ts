import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AccessTokenPayload, AuthenticatedUser } from '@/modules/auth/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'cinedb-access-secret-change-in-production-min-32-chars',
      ),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      jti: payload.jti,
      exp: payload.exp,
      iat: payload.iat,
    };
  }
}
