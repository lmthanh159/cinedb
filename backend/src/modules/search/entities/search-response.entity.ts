import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class SearchResultEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ['movie', 'tv', 'person'] })
  mediaType!: 'movie' | 'tv' | 'person';

  @ApiPropertyOptional()
  posterUrl!: string | null;

  @ApiPropertyOptional()
  profileUrl!: string | null;

  @ApiPropertyOptional()
  year!: number | null;

  @ApiPropertyOptional()
  voteAverage!: number | null;

  @ApiPropertyOptional()
  popularity!: number | null;
}

export class SearchListResponseEntity {
  @ApiProperty({ type: [SearchResultEntity] })
  data!: SearchResultEntity[];

  @ApiProperty({ type: PaginationMetaEntity })
  meta!: PaginationMetaEntity;
}

export class AutocompleteSuggestionEntity {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: ['movie', 'tv', 'person'] })
  mediaType!: 'movie' | 'tv' | 'person';

  @ApiPropertyOptional()
  posterUrl!: string | null;

  @ApiPropertyOptional()
  profileUrl!: string | null;
}

export class AutocompleteResponseEntity {
  @ApiProperty({ type: [AutocompleteSuggestionEntity] })
  data!: AutocompleteSuggestionEntity[];
}

export class ReindexResponseEntity {
  @ApiProperty()
  movies!: number;

  @ApiProperty()
  tvSeries!: number;

  @ApiProperty()
  people!: number;
}
