import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AutocompleteQueryDto } from '@/modules/search/dto/autocomplete-query.dto';
import type { DiscoverQueryDto } from '@/modules/search/dto/discover-query.dto';
import type { SearchQueryDto } from '@/modules/search/dto/search-query.dto';
import { ElasticsearchService } from '@/modules/search/elasticsearch.service';
import { SEARCH_INDEX } from '@/modules/search/search.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

type MediaType = 'movie' | 'tv' | 'person';
type IndexedDocument = {
  id: number;
  title?: string;
  name?: string;
  posterUrl?: string | null;
  profileUrl?: string | null;
  releaseYear?: number | null;
  voteAverage?: number | null;
  popularity?: number | null;
};
type EsHit<TDocument> = {
  _score?: number;
  _source?: TDocument;
};
type SearchResult = {
  id: number;
  title: string;
  mediaType: MediaType;
  posterUrl: string | null;
  profileUrl: string | null;
  year: number | null;
  voteAverage: number | null;
  popularity: number | null;
  score?: number;
};
type AutocompleteSuggestion = {
  id: number;
  text: string;
  mediaType: MediaType;
  posterUrl: string | null;
  profileUrl: string | null;
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly autocompleteCacheTtl = 300;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async multiSearch(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (await this.elasticsearchService.isAvailable()) {
      try {
        const [movies, tvSeries, people] = await Promise.all([
          this.searchIndex(SEARCH_INDEX.MOVIES, 'movie', query.query, 1, limit),
          this.searchIndex(SEARCH_INDEX.TV_SERIES, 'tv', query.query, 1, limit),
          this.searchIndex(SEARCH_INDEX.PEOPLE, 'person', query.query, 1, limit),
        ]);
        const allResults = [...movies.data, ...tvSeries.data, ...people.data]
          .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
        const total = movies.meta.total + tvSeries.meta.total + people.meta.total;
        const skip = (page - 1) * limit;

        return this.paginatedResponse(allResults.slice(skip, skip + limit), page, limit, total);
      } catch (error) {
        this.logger.warn(`Elasticsearch multi search failed, falling back: ${String(error)}`);
      }
    }

    return this.fallbackMultiSearch(query);
  }

  async searchMovies(query: SearchQueryDto) {
    return this.searchSingle(query, 'movie');
  }

  async searchTv(query: SearchQueryDto) {
    return this.searchSingle(query, 'tv');
  }

  async searchPeople(query: SearchQueryDto) {
    return this.searchSingle(query, 'person');
  }

  async autocomplete(query: AutocompleteQueryDto) {
    const normalizedQuery = query.query.trim().toLowerCase();
    const limit = query.limit ?? 5;
    const cacheKey = `search:autocomplete:${normalizedQuery}:${limit}`;
    const cached = await this.redisService.get<{ data: AutocompleteSuggestion[] }>(cacheKey);

    if (cached) {
      return cached;
    }

    let data: AutocompleteSuggestion[];

    if (await this.elasticsearchService.isAvailable()) {
      try {
        const [movies, tvSeries, people] = await Promise.all([
          this.autocompleteIndex(SEARCH_INDEX.MOVIES, 'movie', normalizedQuery, limit),
          this.autocompleteIndex(SEARCH_INDEX.TV_SERIES, 'tv', normalizedQuery, limit),
          this.autocompleteIndex(SEARCH_INDEX.PEOPLE, 'person', normalizedQuery, limit),
        ]);

        data = [...movies, ...tvSeries, ...people]
          .slice(0, limit);
      } catch (error) {
        this.logger.warn(`Elasticsearch autocomplete failed, falling back: ${String(error)}`);
        data = await this.fallbackAutocomplete(normalizedQuery, limit);
      }
    } else {
      data = await this.fallbackAutocomplete(normalizedQuery, limit);
    }

    const response = { data };
    await this.redisService.set(cacheKey, response, this.autocompleteCacheTtl);

    return response;
  }

  async discoverMovies(query: DiscoverQueryDto) {
    if (await this.elasticsearchService.isAvailable()) {
      try {
        return this.discoverIndex(SEARCH_INDEX.MOVIES, 'movie', query);
      } catch (error) {
        this.logger.warn(`Elasticsearch movie discover failed, falling back: ${String(error)}`);
      }
    }

    return this.fallbackDiscoverMovies(query);
  }

  async discoverTv(query: DiscoverQueryDto) {
    if (await this.elasticsearchService.isAvailable()) {
      try {
        return this.discoverIndex(SEARCH_INDEX.TV_SERIES, 'tv', query);
      } catch (error) {
        this.logger.warn(`Elasticsearch TV discover failed, falling back: ${String(error)}`);
      }
    }

    return this.fallbackDiscoverTv(query);
  }

  private async searchSingle(query: SearchQueryDto, mediaType: MediaType) {
    if (await this.elasticsearchService.isAvailable()) {
      try {
        const index = this.indexForMediaType(mediaType);
        return this.searchIndex(index, mediaType, query.query, query.page ?? 1, query.limit ?? 20);
      } catch (error) {
        this.logger.warn(`Elasticsearch ${mediaType} search failed, falling back: ${String(error)}`);
      }
    }

    switch (mediaType) {
      case 'movie':
        return this.fallbackMovieSearch(query);
      case 'tv':
        return this.fallbackTvSearch(query);
      default:
        return this.fallbackPersonSearch(query);
    }
  }

  private async searchIndex(
    index: string,
    mediaType: MediaType,
    query: string,
    page: number,
    limit: number,
  ) {
    const from = (page - 1) * limit;
    const fields =
      mediaType === 'person'
        ? ['name^4', 'originalName^2', 'biography', 'knownForDepartment']
        : ['title^4', 'originalTitle^2', 'overview', 'cast', 'director', 'creator', 'genreNames'];
    const response = await this.elasticsearchService.search<IndexedDocument>(index, {
      from,
      size: limit,
      query: {
        multi_match: {
          query,
          fields,
          fuzziness: 'AUTO',
        },
      },
    });
    const hits = response.hits.hits as Array<EsHit<IndexedDocument>>;
    const total = this.extractTotal(response.hits.total);

    return this.paginatedResponse(
      hits.map((hit) => this.mapHit(hit, mediaType)).filter(Boolean) as SearchResult[],
      page,
      limit,
      total,
    );
  }

  private async autocompleteIndex(
    index: string,
    mediaType: MediaType,
    query: string,
    limit: number,
  ) {
    const field = mediaType === 'person' ? 'name.autocomplete' : 'title.autocomplete';
    const response = await this.elasticsearchService.search<IndexedDocument>(index, {
      size: limit,
      query: {
        match: {
          [field]: {
            query,
          },
        },
      },
    });
    const hits = response.hits.hits as Array<EsHit<IndexedDocument>>;

    return hits
      .map((hit) => hit._source)
      .filter((source): source is IndexedDocument => Boolean(source))
      .map((source) => ({
        id: source.id,
        text: source.title ?? source.name ?? '',
        mediaType,
        posterUrl: source.posterUrl ?? null,
        profileUrl: source.profileUrl ?? null,
      }))
      .filter((item) => item.text);
  }

  private async discoverIndex(index: string, mediaType: 'movie' | 'tv', query: DiscoverQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filters: unknown[] = [];
    const genreSlugs = this.parseCsv(query.genres);

    if (genreSlugs.length > 0) {
      filters.push({
        terms: {
          genres: genreSlugs,
        },
      });
    }

    if (query.year_min || query.year_max) {
      filters.push({
        range: {
          releaseYear: {
            ...(query.year_min ? { gte: query.year_min } : {}),
            ...(query.year_max ? { lte: query.year_max } : {}),
          },
        },
      });
    }

    if (query.country) {
      filters.push({
        term: {
          countries: query.country.toUpperCase(),
        },
      });
    }

    if (query.vote_min !== undefined) {
      filters.push({
        range: {
          voteAverage: {
            gte: query.vote_min,
          },
        },
      });
    }

    const response = await this.elasticsearchService.search<IndexedDocument>(index, {
      from: (page - 1) * limit,
      size: limit,
      query: {
        bool: {
          filter: filters,
        },
      },
      sort: [this.buildEsSort(query.sort_by)],
    });
    const hits = response.hits.hits as Array<EsHit<IndexedDocument>>;
    const total = this.extractTotal(response.hits.total);

    return this.paginatedResponse(
      hits.map((hit) => this.mapHit(hit, mediaType)).filter(Boolean) as SearchResult[],
      page,
      limit,
      total,
    );
  }

  private async fallbackMultiSearch(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [movies, tvSeries, people] = await Promise.all([
      this.fallbackMovieSearch({ ...query, page: 1, limit }),
      this.fallbackTvSearch({ ...query, page: 1, limit }),
      this.fallbackPersonSearch({ ...query, page: 1, limit }),
    ]);
    const allResults = [...movies.data, ...tvSeries.data, ...people.data];
    const total = movies.meta.total + tvSeries.meta.total + people.meta.total;
    const skip = (page - 1) * limit;

    return this.paginatedResponse(allResults.slice(skip, skip + limit), page, limit, total);
  }

  private async fallbackMovieSearch(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MovieWhereInput = {
      isDeleted: false,
      OR: [
        { title: { contains: query.query, mode: 'insensitive' } },
        { originalTitle: { contains: query.query, mode: 'insensitive' } },
        { overview: { contains: query.query, mode: 'insensitive' } },
        { cast: { some: { person: { name: { contains: query.query, mode: 'insensitive' } } } } },
        { crew: { some: { person: { name: { contains: query.query, mode: 'insensitive' } } } } },
      ],
    };
    const [total, movies] = await this.prismaService.$transaction([
      this.prismaService.movie.count({ where }),
      this.prismaService.movie.findMany({
        where,
        orderBy: { popularity: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.movieSearchSelect(),
      }),
    ]);

    return this.paginatedResponse(movies.map((movie) => this.mapMovie(movie)), page, limit, total);
  }

  private async fallbackTvSearch(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TVSeriesWhereInput = {
      isDeleted: false,
      OR: [
        { title: { contains: query.query, mode: 'insensitive' } },
        { originalTitle: { contains: query.query, mode: 'insensitive' } },
        { overview: { contains: query.query, mode: 'insensitive' } },
        { cast: { some: { person: { name: { contains: query.query, mode: 'insensitive' } } } } },
        { crew: { some: { person: { name: { contains: query.query, mode: 'insensitive' } } } } },
      ],
    };
    const [total, series] = await this.prismaService.$transaction([
      this.prismaService.tVSeries.count({ where }),
      this.prismaService.tVSeries.findMany({
        where,
        orderBy: { popularity: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.seriesSearchSelect(),
      }),
    ]);

    return this.paginatedResponse(series.map((item) => this.mapSeries(item)), page, limit, total);
  }

  private async fallbackPersonSearch(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PersonWhereInput = {
      OR: [
        { name: { contains: query.query, mode: 'insensitive' } },
        { originalName: { contains: query.query, mode: 'insensitive' } },
        { biography: { contains: query.query, mode: 'insensitive' } },
      ],
    };
    const [total, people] = await this.prismaService.$transaction([
      this.prismaService.person.count({ where }),
      this.prismaService.person.findMany({
        where,
        orderBy: { popularity: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          profileUrl: true,
          popularity: true,
        },
      }),
    ]);

    return this.paginatedResponse(
      people.map((person) => ({
        id: person.id,
        title: person.name,
        mediaType: 'person' as const,
        posterUrl: null,
        profileUrl: person.profileUrl,
        year: null,
        voteAverage: null,
        popularity: person.popularity,
      })),
      page,
      limit,
      total,
    );
  }

  private async fallbackAutocomplete(query: string, limit: number) {
    const [movies, tvSeries, people] = await Promise.all([
      this.prismaService.movie.findMany({
        where: {
          isDeleted: false,
          title: { contains: query, mode: 'insensitive' },
        },
        orderBy: { popularity: 'desc' },
        take: limit,
        select: { id: true, title: true, posterUrl: true },
      }),
      this.prismaService.tVSeries.findMany({
        where: {
          isDeleted: false,
          title: { contains: query, mode: 'insensitive' },
        },
        orderBy: { popularity: 'desc' },
        take: limit,
        select: { id: true, title: true, posterUrl: true },
      }),
      this.prismaService.person.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        orderBy: { popularity: 'desc' },
        take: limit,
        select: { id: true, name: true, profileUrl: true },
      }),
    ]);

    return [
      ...movies.map((movie) => ({
        id: movie.id,
        text: movie.title,
        mediaType: 'movie' as const,
        posterUrl: movie.posterUrl,
        profileUrl: null,
      })),
      ...tvSeries.map((series) => ({
        id: series.id,
        text: series.title,
        mediaType: 'tv' as const,
        posterUrl: series.posterUrl,
        profileUrl: null,
      })),
      ...people.map((person) => ({
        id: person.id,
        text: person.name,
        mediaType: 'person' as const,
        posterUrl: null,
        profileUrl: person.profileUrl,
      })),
    ].slice(0, limit);
  }

  private async fallbackDiscoverMovies(query: DiscoverQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MovieWhereInput = {
      isDeleted: false,
      ...this.buildMovieDiscoverWhere(query),
    };
    const [total, movies] = await this.prismaService.$transaction([
      this.prismaService.movie.count({ where }),
      this.prismaService.movie.findMany({
        where,
        orderBy: this.buildPrismaMovieSort(query.sort_by),
        skip: (page - 1) * limit,
        take: limit,
        select: this.movieSearchSelect(),
      }),
    ]);

    return this.paginatedResponse(movies.map((movie) => this.mapMovie(movie)), page, limit, total);
  }

  private async fallbackDiscoverTv(query: DiscoverQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TVSeriesWhereInput = {
      isDeleted: false,
      ...this.buildSeriesDiscoverWhere(query),
    };
    const [total, series] = await this.prismaService.$transaction([
      this.prismaService.tVSeries.count({ where }),
      this.prismaService.tVSeries.findMany({
        where,
        orderBy: this.buildPrismaSeriesSort(query.sort_by),
        skip: (page - 1) * limit,
        take: limit,
        select: this.seriesSearchSelect(),
      }),
    ]);

    return this.paginatedResponse(series.map((item) => this.mapSeries(item)), page, limit, total);
  }

  private buildMovieDiscoverWhere(query: DiscoverQueryDto): Prisma.MovieWhereInput {
    return {
      ...(this.parseNumericCsv(query.genres).length > 0
        ? { genres: { some: { id: { in: this.parseNumericCsv(query.genres) } } } }
        : {}),
      ...(query.year_min || query.year_max
        ? {
            releaseDate: {
              ...(query.year_min ? { gte: new Date(`${query.year_min}-01-01T00:00:00.000Z`) } : {}),
              ...(query.year_max ? { lte: new Date(`${query.year_max}-12-31T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.country
        ? { countries: { some: { isoCode: query.country.toUpperCase() } } }
        : {}),
      ...(query.vote_min !== undefined ? { voteAverage: { gte: query.vote_min } } : {}),
    };
  }

  private buildSeriesDiscoverWhere(query: DiscoverQueryDto): Prisma.TVSeriesWhereInput {
    return {
      ...(this.parseNumericCsv(query.genres).length > 0
        ? { genres: { some: { id: { in: this.parseNumericCsv(query.genres) } } } }
        : {}),
      ...(query.year_min || query.year_max
        ? {
            firstAirDate: {
              ...(query.year_min ? { gte: new Date(`${query.year_min}-01-01T00:00:00.000Z`) } : {}),
              ...(query.year_max ? { lte: new Date(`${query.year_max}-12-31T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.country
        ? { countries: { some: { isoCode: query.country.toUpperCase() } } }
        : {}),
      ...(query.vote_min !== undefined ? { voteAverage: { gte: query.vote_min } } : {}),
    };
  }

  private mapHit(hit: EsHit<IndexedDocument>, mediaType: MediaType): SearchResult | null {
    const source = hit._source;

    if (!source) {
      return null;
    }

    return {
      id: source.id,
      title: source.title ?? source.name ?? '',
      mediaType,
      posterUrl: source.posterUrl ?? null,
      profileUrl: source.profileUrl ?? null,
      year: source.releaseYear ?? null,
      voteAverage: source.voteAverage ?? null,
      popularity: source.popularity ?? null,
      score: hit._score,
    };
  }

  private mapMovie(movie: {
    id: number;
    title: string;
    posterUrl: string | null;
    releaseDate: Date | null;
    voteAverage: number;
    popularity: number;
  }): SearchResult {
    return {
      id: movie.id,
      title: movie.title,
      mediaType: 'movie',
      posterUrl: movie.posterUrl,
      profileUrl: null,
      year: movie.releaseDate?.getFullYear() ?? null,
      voteAverage: movie.voteAverage,
      popularity: movie.popularity,
    };
  }

  private mapSeries(series: {
    id: number;
    title: string;
    posterUrl: string | null;
    firstAirDate: Date | null;
    voteAverage: number;
    popularity: number;
  }): SearchResult {
    return {
      id: series.id,
      title: series.title,
      mediaType: 'tv',
      posterUrl: series.posterUrl,
      profileUrl: null,
      year: series.firstAirDate?.getFullYear() ?? null,
      voteAverage: series.voteAverage,
      popularity: series.popularity,
    };
  }

  private movieSearchSelect() {
    return {
      id: true,
      title: true,
      posterUrl: true,
      releaseDate: true,
      voteAverage: true,
      popularity: true,
    } satisfies Prisma.MovieSelect;
  }

  private seriesSearchSelect() {
    return {
      id: true,
      title: true,
      posterUrl: true,
      firstAirDate: true,
      voteAverage: true,
      popularity: true,
    } satisfies Prisma.TVSeriesSelect;
  }

  private buildEsSort(sortBy = 'popularity.desc') {
    const [field, direction] = sortBy.split('.');
    const sortField =
      field === 'voteAverage' || field === 'vote_average'
        ? 'voteAverage'
        : field === 'releaseDate' || field === 'release_date' || field === 'firstAirDate'
          ? 'releaseYear'
          : 'popularity';

    return {
      [sortField]: {
        order: direction === 'asc' ? 'asc' : 'desc',
      },
    };
  }

  private buildPrismaMovieSort(sortBy = 'popularity.desc'): Prisma.MovieOrderByWithRelationInput {
    if (sortBy.startsWith('voteAverage') || sortBy.startsWith('vote_average')) {
      return { voteAverage: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
    }

    if (sortBy.startsWith('releaseDate') || sortBy.startsWith('release_date')) {
      return { releaseDate: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
    }

    return { popularity: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
  }

  private buildPrismaSeriesSort(sortBy = 'popularity.desc'): Prisma.TVSeriesOrderByWithRelationInput {
    if (sortBy.startsWith('voteAverage') || sortBy.startsWith('vote_average')) {
      return { voteAverage: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
    }

    if (sortBy.startsWith('firstAirDate') || sortBy.startsWith('release_date')) {
      return { firstAirDate: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
    }

    return { popularity: sortBy.endsWith('.asc') ? 'asc' : 'desc' };
  }

  private indexForMediaType(mediaType: MediaType) {
    switch (mediaType) {
      case 'movie':
        return SEARCH_INDEX.MOVIES;
      case 'tv':
        return SEARCH_INDEX.TV_SERIES;
      default:
        return SEARCH_INDEX.PEOPLE;
    }
  }

  private parseCsv(value?: string) {
    return value
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private parseNumericCsv(value?: string) {
    return this.parseCsv(value)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  private extractTotal(total: unknown) {
    if (typeof total === 'number') {
      return total;
    }

    if (total && typeof total === 'object' && 'value' in total) {
      return Number((total as { value: number }).value);
    }

    return 0;
  }

  private paginatedResponse<T>(data: T[], page: number, limit: number, total: number) {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
