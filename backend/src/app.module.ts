import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AdminDashboardModule } from '@/modules/admin-dashboard/admin-dashboard.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { GenresModule } from '@/modules/genres/genres.module';
import { HealthModule } from '@/modules/health/health.module';
import { MoviesModule } from '@/modules/movies/movies.module';
import { PeopleModule } from '@/modules/people/people.module';
import { RatingsCommentsModule } from '@/modules/ratings-comments/ratings-comments.module';
import { RecommendationsModule } from '@/modules/recommendations/recommendations.module';
import { SearchModule } from '@/modules/search/search.module';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';
import { TrendingModule } from '@/modules/trending/trending.module';
import { TvSeriesModule } from '@/modules/tv-series/tv-series.module';
import { UsersModule } from '@/modules/users/users.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    PrismaModule,
    RedisModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    AuthModule,
    MoviesModule,
    TvSeriesModule,
    PeopleModule,
    RatingsCommentsModule,
    UsersModule,
    SearchModule,
    RecommendationsModule,
    TrendingModule,
    GenresModule,
    TmdbModule,
    AdminDashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
