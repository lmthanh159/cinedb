import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { ElasticsearchService } from '@/modules/search/elasticsearch.service';
import {
  MOVIES_INDEX_MAPPING,
  PEOPLE_INDEX_MAPPING,
  SEARCH_INDEX,
  TV_SERIES_INDEX_MAPPING,
} from '@/modules/search/search.constants';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SearchSyncService implements OnModuleInit {
  private readonly logger = new Logger(SearchSyncService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    if (!(await this.elasticsearchService.isAvailable())) {
      return;
    }

    try {
      await this.ensureIndexes();
    } catch (error) {
      this.logger.warn(`Search indexes were not initialized: ${String(error)}`);
    }
  }

  async ensureIndexes() {
    await Promise.all([
      this.elasticsearchService.createIndex(SEARCH_INDEX.MOVIES, MOVIES_INDEX_MAPPING),
      this.elasticsearchService.createIndex(SEARCH_INDEX.TV_SERIES, TV_SERIES_INDEX_MAPPING),
      this.elasticsearchService.createIndex(SEARCH_INDEX.PEOPLE, PEOPLE_INDEX_MAPPING),
    ]);
  }

  async syncAll() {
    await this.ensureIndexes();

    const [movies, tvSeries, people] = await Promise.all([
      this.syncAllMovies(),
      this.syncAllTV(),
      this.syncAllPeople(),
    ]);

    return {
      movies,
      tvSeries,
      people,
    };
  }

  async syncAllMovies() {
    const movies = await this.prismaService.movie.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        genres: true,
        countries: true,
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          take: 10,
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    await this.elasticsearchService.bulkIndex(
      SEARCH_INDEX.MOVIES,
      movies.map((movie) => ({
        id: movie.id,
        body: this.transformMovie(movie),
      })),
    );

    this.logger.log(`Indexed ${movies.length} movies.`);
    return movies.length;
  }

  async syncAllTV() {
    const series = await this.prismaService.tVSeries.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        genres: true,
        countries: true,
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          take: 10,
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    await this.elasticsearchService.bulkIndex(
      SEARCH_INDEX.TV_SERIES,
      series.map((item) => ({
        id: item.id,
        body: this.transformSeries(item),
      })),
    );

    this.logger.log(`Indexed ${series.length} TV series.`);
    return series.length;
  }

  async syncAllPeople() {
    const people = await this.prismaService.person.findMany();

    await this.elasticsearchService.bulkIndex(
      SEARCH_INDEX.PEOPLE,
      people.map((person) => ({
        id: person.id,
        body: {
          id: person.id,
          name: person.name,
          originalName: person.originalName,
          biography: person.biography,
          knownForDepartment: person.knownForDepartment,
          popularity: person.popularity,
          profileUrl: person.profileUrl,
        },
      })),
    );

    this.logger.log(`Indexed ${people.length} people.`);
    return people.length;
  }

  async syncMovie(id: number) {
    const movie = await this.prismaService.movie.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        genres: true,
        countries: true,
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          take: 10,
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!movie) {
      await this.removeMovie(id);
      return;
    }

    await this.elasticsearchService.indexDocument(
      SEARCH_INDEX.MOVIES,
      id,
      this.transformMovie(movie),
    );
  }

  async removeMovie(id: number) {
    await this.elasticsearchService.deleteDocument(SEARCH_INDEX.MOVIES, id);
  }

  async syncSeries(id: number) {
    const series = await this.prismaService.tVSeries.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        genres: true,
        countries: true,
        cast: {
          orderBy: {
            displayOrder: 'asc',
          },
          take: 10,
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!series) {
      await this.removeSeries(id);
      return;
    }

    await this.elasticsearchService.indexDocument(
      SEARCH_INDEX.TV_SERIES,
      id,
      this.transformSeries(series),
    );
  }

  async removeSeries(id: number) {
    await this.elasticsearchService.deleteDocument(SEARCH_INDEX.TV_SERIES, id);
  }

  private transformMovie(movie: Awaited<ReturnType<SearchSyncService['loadMovieShape']>>) {
    if (!movie) {
      return {};
    }

    const director = movie.crew.find((crewMember) =>
      ['director', 'directing'].some((role) =>
        `${crewMember.job ?? ''} ${crewMember.department ?? ''}`.toLowerCase().includes(role),
      ),
    );

    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: movie.overview,
      genres: movie.genres.map((genre) => String(genre.id)),
      genreNames: movie.genres.map((genre) => genre.name),
      countries: movie.countries.map((country) => country.isoCode),
      cast: movie.cast.map((castMember) => castMember.person.name),
      director: director?.person.name ?? null,
      releaseDate: movie.releaseDate,
      releaseYear: movie.releaseDate?.getFullYear() ?? null,
      voteAverage: movie.voteAverage,
      tmdbVoteAverage: movie.tmdbVoteAverage,
      popularity: movie.popularity,
      posterUrl: movie.posterUrl,
    };
  }

  private transformSeries(series: Awaited<ReturnType<SearchSyncService['loadSeriesShape']>>) {
    if (!series) {
      return {};
    }

    const creator = series.crew.find((crewMember) =>
      ['creator', 'director', 'directing'].some((role) =>
        `${crewMember.job ?? ''} ${crewMember.department ?? ''}`.toLowerCase().includes(role),
      ),
    );

    return {
      id: series.id,
      title: series.title,
      originalTitle: series.originalTitle,
      overview: series.overview,
      genres: series.genres.map((genre) => String(genre.id)),
      genreNames: series.genres.map((genre) => genre.name),
      countries: series.countries.map((country) => country.isoCode),
      cast: series.cast.map((castMember) => castMember.person.name),
      creator: creator?.person.name ?? null,
      firstAirDate: series.firstAirDate,
      releaseYear: series.firstAirDate?.getFullYear() ?? null,
      voteAverage: series.voteAverage,
      tmdbVoteAverage: series.tmdbVoteAverage,
      popularity: series.popularity,
      posterUrl: series.posterUrl,
    };
  }

  private async loadMovieShape(id: number) {
    return this.prismaService.movie.findFirst({
      where: { id },
      include: {
        genres: true,
        countries: true,
        cast: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  private async loadSeriesShape(id: number) {
    return this.prismaService.tVSeries.findFirst({
      where: { id },
      include: {
        genres: true,
        countries: true,
        cast: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        crew: {
          include: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
