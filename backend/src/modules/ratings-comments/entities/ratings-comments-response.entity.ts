import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserSummaryEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;
}

class RatedMediaEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  posterUrl!: string | null;
}

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

export class RatingResponseEntity {
  @ApiProperty()
  score!: number;

  @ApiProperty()
  movieVoteAverage!: number;

  @ApiProperty()
  movieVoteCount!: number;
}

export class SeriesRatingResponseEntity {
  @ApiProperty()
  score!: number;

  @ApiProperty()
  seriesVoteAverage!: number;

  @ApiProperty()
  seriesVoteCount!: number;
}

export class MyRatingEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  score!: number;

  @ApiPropertyOptional({ type: RatedMediaEntity })
  movie!: RatedMediaEntity | null;

  @ApiPropertyOptional({ type: RatedMediaEntity })
  series!: RatedMediaEntity | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MyRatingsResponseEntity {
  @ApiProperty({ type: [MyRatingEntity] })
  data!: MyRatingEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

export class CommentResponseEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  movieId!: number | null;

  @ApiPropertyOptional()
  seriesId!: number | null;

  @ApiProperty({ type: UserSummaryEntity })
  user!: UserSummaryEntity;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ReportResponseEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;
}
