import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenreEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 28, nullable: true })
  tmdbId?: number | null;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiProperty({ example: 'action' })
  slug!: string;

  @ApiProperty({ example: 42 })
  count!: number;
}

export class GenreListResponseEntity {
  @ApiProperty({ type: [GenreEntity] })
  data!: GenreEntity[];
}

export class AdminGenreEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 28, nullable: true })
  tmdbId?: number | null;

  @ApiProperty({ example: 'Action' })
  name!: string;

  @ApiProperty({ example: 'action' })
  slug!: string;

  @ApiProperty({ example: 42 })
  movieCount!: number;

  @ApiProperty({ example: 12 })
  tvCount!: number;

  @ApiProperty({ example: '2026-05-23T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-23T10:00:00.000Z' })
  updatedAt!: Date;
}

export class AdminGenreListResponseEntity {
  @ApiProperty({ type: [AdminGenreEntity] })
  data!: AdminGenreEntity[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 50,
      total: 18,
      totalPages: 1,
    },
  })
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
