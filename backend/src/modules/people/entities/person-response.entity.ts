import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderType } from '@prisma/client';

export class PersonPaginationMetaEntity {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class PersonResponseEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 12345, nullable: true })
  tmdbId?: number | null;

  @ApiProperty({ example: 'Hayao Miyazaki' })
  name!: string;

  @ApiPropertyOptional({ example: '宮崎 駿', nullable: true })
  originalName?: string | null;

  @ApiPropertyOptional({ example: 'Legendary animator and director.', nullable: true })
  biography?: string | null;

  @ApiPropertyOptional({ example: '1941-01-05T00:00:00.000Z', nullable: true })
  birthday?: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  deathday?: Date | null;

  @ApiPropertyOptional({ example: 'Tokyo, Japan', nullable: true })
  placeOfBirth?: string | null;

  @ApiProperty({ enum: GenderType, example: GenderType.MALE })
  gender!: GenderType;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/profile.jpg', nullable: true })
  profileUrl?: string | null;

  @ApiProperty({ example: 140.5 })
  popularity!: number;

  @ApiPropertyOptional({ example: 'Directing', nullable: true })
  knownForDepartment?: string | null;
}

export class PersonListResponseEntity {
  @ApiProperty({ type: [PersonResponseEntity] })
  data!: PersonResponseEntity[];

  @ApiProperty({ type: PersonPaginationMetaEntity })
  meta!: PersonPaginationMetaEntity;
}

export class PersonCreditMovieEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Spirited Away' })
  title!: string;

  @ApiPropertyOptional({ example: '2001-07-20T00:00:00.000Z', nullable: true })
  releaseDate?: Date | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl?: string | null;
}

export class PersonCreditSeriesEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Breaking Bad' })
  title!: string;

  @ApiPropertyOptional({ example: '2008-01-20T00:00:00.000Z', nullable: true })
  firstAirDate?: Date | null;

  @ApiPropertyOptional({ example: 'https://image.tmdb.org/t/p/w500/poster.jpg', nullable: true })
  posterUrl?: string | null;
}

export class PersonMovieCastCreditEntity {
  @ApiProperty({ type: PersonCreditMovieEntity })
  movie!: PersonCreditMovieEntity;

  @ApiPropertyOptional({ example: 'Chihiro', nullable: true })
  character?: string | null;
}

export class PersonMovieCrewCreditEntity {
  @ApiProperty({ type: PersonCreditMovieEntity })
  movie!: PersonCreditMovieEntity;

  @ApiPropertyOptional({ example: 'Director', nullable: true })
  job?: string | null;

  @ApiPropertyOptional({ example: 'Directing', nullable: true })
  department?: string | null;
}

export class PersonTvCastCreditEntity {
  @ApiProperty({ type: PersonCreditSeriesEntity })
  series!: PersonCreditSeriesEntity;

  @ApiPropertyOptional({ example: 'Walter White', nullable: true })
  character?: string | null;
}

export class PersonTvCrewCreditEntity {
  @ApiProperty({ type: PersonCreditSeriesEntity })
  series!: PersonCreditSeriesEntity;

  @ApiPropertyOptional({ example: 'Director', nullable: true })
  job?: string | null;

  @ApiPropertyOptional({ example: 'Directing', nullable: true })
  department?: string | null;
}

export class PersonMovieCreditsResponseEntity {
  @ApiProperty({ type: [PersonMovieCastCreditEntity] })
  cast!: PersonMovieCastCreditEntity[];

  @ApiProperty({ type: [PersonMovieCrewCreditEntity] })
  crew!: PersonMovieCrewCreditEntity[];
}

export class PersonTvCreditsResponseEntity {
  @ApiProperty({ type: [PersonTvCastCreditEntity] })
  cast!: PersonTvCastCreditEntity[];

  @ApiProperty({ type: [PersonTvCrewCreditEntity] })
  crew!: PersonTvCrewCreditEntity[];
}

export class PersonImageEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'https://image.tmdb.org/t/p/original/profile.jpg' })
  filePath!: string;

  @ApiProperty({ example: 'profile' })
  type!: string;

  @ApiPropertyOptional({ example: 1080, nullable: true })
  width?: number | null;

  @ApiPropertyOptional({ example: 1600, nullable: true })
  height?: number | null;
}

export class PersonImagesResponseEntity {
  @ApiProperty({ type: [PersonImageEntity] })
  images!: PersonImageEntity[];
}
