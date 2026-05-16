import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RedisService } from '@/redis/redis.service';

type RequestUser = {
  jti?: string;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  override async canActivate(context: ExecutionContext) {
    const isAllowed = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const tokenId = request.user?.jti;

    if (!tokenId) {
      return isAllowed;
    }

    const blacklistedToken = await this.redisService.get<string>(
      `blacklist:token:${tokenId}`,
    );

    if (blacklistedToken) {
      throw new UnauthorizedException('Token has been revoked.');
    }

    return isAllowed;
  }

  override handleRequest<TUser>(err: unknown, user: TUser | undefined) {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
