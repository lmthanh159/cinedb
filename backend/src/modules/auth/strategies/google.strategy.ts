import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile,
  Strategy,
  VerifyCallback,
} from 'passport-google-oauth20';

import type { GoogleProfileUser } from '@/modules/auth/auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id-disabled',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret-disabled',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account did not return an email address.'), false);
      return;
    }

    const user: GoogleProfileUser = {
      email,
      displayName: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
      googleId: profile.id,
    };

    done(null, user);
  }
}
