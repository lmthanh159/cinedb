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
