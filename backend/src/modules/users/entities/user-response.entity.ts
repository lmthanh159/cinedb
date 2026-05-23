import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

class PaginationMetaEntity {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

class BasicMediaEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  posterUrl!: string | null;

  @ApiPropertyOptional()
  year!: number | null;

  @ApiProperty()
  voteAverage!: number;

  @ApiProperty()
  voteCount!: number;
}

export class UserProfileEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;

  @ApiPropertyOptional()
  bio!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  language!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminUserEntity extends UserProfileEntity {
  @ApiPropertyOptional()
  lockedUntil!: Date | null;

  @ApiProperty()
  loginAttempts!: number;

  @ApiProperty()
  totalRatings!: number;

  @ApiProperty()
  totalComments!: number;
}

export class AdminUserListResponseEntity {
  @ApiProperty({ type: [AdminUserEntity] })
  data!: AdminUserEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

export class AdminStatsEntity {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  totalRatings!: number;

  @ApiProperty()
  totalComments!: number;
}

export class ToggleResponseEntity {
  @ApiProperty()
  added!: boolean;
}

export class CollectionItemEntity {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional({ type: BasicMediaEntity })
  movie!: BasicMediaEntity | null;

  @ApiPropertyOptional({ type: BasicMediaEntity })
  series!: BasicMediaEntity | null;

  @ApiProperty()
  addedAt!: Date;
}

export class CollectionListResponseEntity {
  @ApiProperty({ type: [CollectionItemEntity] })
  data!: CollectionItemEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

class ActivityMediaEntity extends BasicMediaEntity {}

export class ActivityLogEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional()
  entityType!: string | null;

  @ApiPropertyOptional()
  entityId!: number | null;

  @ApiPropertyOptional({ type: ActivityMediaEntity })
  entity!: ActivityMediaEntity | null;

  @ApiPropertyOptional()
  metadata!: unknown;

  @ApiProperty()
  createdAt!: Date;
}

export class ActivityListResponseEntity {
  @ApiProperty({ type: [ActivityLogEntity] })
  data!: ActivityLogEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

class PublicUserStatsEntity {
  @ApiProperty()
  totalRatings!: number;

  @ApiProperty()
  totalComments!: number;
}

export class PublicUserProfileEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;

  @ApiPropertyOptional()
  bio!: string | null;

  @ApiProperty()
  memberSince!: Date;

  @ApiProperty({ type: PublicUserStatsEntity })
  stats!: PublicUserStatsEntity;
}
