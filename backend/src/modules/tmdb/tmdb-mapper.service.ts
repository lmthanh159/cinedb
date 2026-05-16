import { Injectable } from '@nestjs/common';
import {
  GenderType,
  Prisma,
} from '@prisma/client';

import {
  TmdbCastMember,
  TmdbCredits,
  TmdbCrewMember,
  TmdbImages,
  TmdbMovieDetail,
  TmdbPersonDetail,
  TmdbSeasonDetail,
  TmdbTVDetail,
  TmdbVideos,
} from '@/modules/tmdb/interfaces/tmdb.interface';
import { TmdbClientService } from '@/modules/tmdb/tmdb-client.service';

export type MappedMovie = {
  data: Prisma.MovieCreateInput;
  genreTmdbIds: number[];
  countries: Array<{ isoCode: string; name: string }>;
  companies: Array<{
    tmdbId: number;
    name: string;
    logoUrl: string | null;
    originCountry: string | null;
  }>;
};

export type MappedTvSeries = {
  data: Prisma.TVSeriesCreateInput;
  genreTmdbIds: number[];
  countries: Array<{ isoCode: string; name: string }>;
  companies: Array<{
    tmdbId: number;
    name: string;
    logoUrl: string | null;
    originCountry: string | null;
  }>;
};

export type MappedSeason = {
  data: Omit<Prisma.SeasonUncheckedCreateInput, 'seriesId'>;
  episodes: Array<Omit<Prisma.EpisodeUncheckedCreateInput, 'seasonId'>>;
};

export type MappedPerson = Prisma.PersonCreateInput;

export type MappedCast = {
  people: MappedPerson[];
  cast: Array<{
    personTmdbId: number;
    character: string | null;
    displayOrder: number;
  }>;
};

export type MappedCrew = {
  people: MappedPerson[];
  crew: Array<{
    personTmdbId: number;
    job: string | null;
    department: string | null;
  }>;
};

@Injectable()
export class TmdbMapperService {
  constructor(private readonly tmdbClientService: TmdbClientService) {}

  toMovie(tmdbData: TmdbMovieDetail): MappedMovie {
    return {
      data: {
        tmdbId: tmdbData.id,
        title: this.nullableString(tmdbData.title) ?? 'Untitled Movie',
        originalTitle: this.nullableString(tmdbData.original_title),
        overview: this.nullableString(tmdbData.overview),
        releaseDate: this.toDate(tmdbData.release_date),
        runtime: tmdbData.runtime ?? null,
        language: this.nullableString(tmdbData.original_language),
        budget: BigInt(tmdbData.budget ?? 0),
        revenue: BigInt(tmdbData.revenue ?? 0),
        status: this.nullableString(tmdbData.status),
        tmdbVoteAverage: tmdbData.vote_average ?? 0,
        tmdbVoteCount: tmdbData.vote_count ?? 0,
        popularity: tmdbData.popularity ?? 0,
        posterUrl: this.tmdbClientService.getImageUrl(tmdbData.poster_path, 'w500'),
        backdropUrl: this.tmdbClientService.getImageUrl(tmdbData.backdrop_path, 'w1280'),
        tmdbLastSynced: new Date(),
      },
      genreTmdbIds: tmdbData.genres.map((genre) => genre.id),
      countries: tmdbData.production_countries.map((country) => ({
        isoCode: country.iso_3166_1,
        name: country.name,
      })),
      companies: tmdbData.production_companies.map((company) => ({
        tmdbId: company.id,
        name: company.name,
        logoUrl: this.tmdbClientService.getImageUrl(company.logo_path, 'w185'),
        originCountry: this.nullableString(company.origin_country),
      })),
    };
  }

  toTVSeries(tmdbData: TmdbTVDetail): MappedTvSeries {
    return {
      data: {
        tmdbId: tmdbData.id,
        title: this.nullableString(tmdbData.name) ?? 'Untitled TV Series',
        originalTitle: this.nullableString(tmdbData.original_name),
        overview: this.nullableString(tmdbData.overview),
        firstAirDate: this.toDate(tmdbData.first_air_date),
        lastAirDate: this.toDate(tmdbData.last_air_date),
        status: this.nullableString(tmdbData.status),
        numberOfSeasons: tmdbData.number_of_seasons ?? 0,
        numberOfEpisodes: tmdbData.number_of_episodes ?? 0,
        tmdbVoteAverage: tmdbData.vote_average ?? 0,
        tmdbVoteCount: tmdbData.vote_count ?? 0,
        popularity: tmdbData.popularity ?? 0,
        posterUrl: this.tmdbClientService.getImageUrl(tmdbData.poster_path, 'w500'),
        backdropUrl: this.tmdbClientService.getImageUrl(tmdbData.backdrop_path, 'w1280'),
        tmdbLastSynced: new Date(),
      },
      genreTmdbIds: tmdbData.genres.map((genre) => genre.id),
      countries: tmdbData.production_countries.map((country) => ({
        isoCode: country.iso_3166_1,
        name: country.name,
      })),
      companies: tmdbData.production_companies.map((company) => ({
        tmdbId: company.id,
        name: company.name,
        logoUrl: this.tmdbClientService.getImageUrl(company.logo_path, 'w185'),
        originCountry: this.nullableString(company.origin_country),
      })),
    };
  }

  toSeason(tmdbData: TmdbSeasonDetail): MappedSeason {
    return {
      data: {
        tmdbId: tmdbData.id,
        seasonNumber: tmdbData.season_number,
        name: this.nullableString(tmdbData.name),
        overview: this.nullableString(tmdbData.overview),
        airDate: this.toDate(tmdbData.air_date),
        posterUrl: this.tmdbClientService.getImageUrl(tmdbData.poster_path, 'w500'),
        episodeCount: tmdbData.episodes.length,
      },
      episodes: tmdbData.episodes.map((episode) => ({
        tmdbId: episode.id,
        episodeNumber: episode.episode_number,
        name: this.nullableString(episode.name),
        overview: this.nullableString(episode.overview),
        airDate: this.toDate(episode.air_date),
        runtime: episode.runtime ?? null,
        stillUrl: this.tmdbClientService.getImageUrl(episode.still_path, 'w500'),
        voteAverage: episode.vote_average ?? 0,
        voteCount: episode.vote_count ?? 0,
      })),
    };
  }

  toPerson(tmdbData: TmdbPersonDetail | TmdbCastMember | TmdbCrewMember): MappedPerson {
    return {
      tmdbId: tmdbData.id,
      name: this.nullableString(tmdbData.name) ?? 'Unknown Person',
      originalName: this.nullableString(tmdbData.original_name),
      ...('biography' in tmdbData ? { biography: this.nullableString(tmdbData.biography) } : {}),
      ...('birthday' in tmdbData ? { birthday: this.toDate(tmdbData.birthday) } : {}),
      ...('deathday' in tmdbData ? { deathday: this.toDate(tmdbData.deathday) } : {}),
      ...('place_of_birth' in tmdbData
        ? { placeOfBirth: this.nullableString(tmdbData.place_of_birth) }
        : {}),
      ...('gender' in tmdbData ? { gender: this.toGender(tmdbData.gender) } : {}),
      profileUrl: this.tmdbClientService.getImageUrl(tmdbData.profile_path, 'w185'),
      popularity: 'popularity' in tmdbData ? tmdbData.popularity ?? 0 : 0,
      knownForDepartment:
        'known_for_department' in tmdbData
          ? this.nullableString(tmdbData.known_for_department)
          : null,
      tmdbLastSynced: new Date(),
    };
  }

  toCast(credits: TmdbCredits, limit: number): MappedCast {
    const castMembers = credits.cast.slice(0, limit);

    return {
      people: castMembers.map((person) => this.toPerson(person)),
      cast: castMembers.map((person) => ({
        personTmdbId: person.id,
        character: this.nullableString(person.character),
        displayOrder: person.order ?? 0,
      })),
    };
  }

  toCrew(credits: TmdbCredits): MappedCrew {
    return {
      people: credits.crew.map((person) => this.toPerson(person)),
      crew: credits.crew.map((person) => ({
        personTmdbId: person.id,
        job: this.nullableString(person.job),
        department: this.nullableString(person.department),
      })),
    };
  }

  toTrailers(videos?: TmdbVideos): Prisma.TrailerUncheckedCreateWithoutMovieInput[] {
    return (videos?.results ?? [])
      .filter((video) =>
        video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type),
      )
      .map((video) => ({
        name: this.nullableString(video.name),
        key: video.key,
        site: video.site,
        type: this.nullableString(video.type),
        official: video.official,
        publishedAt: this.toDate(video.published_at),
      }));
  }

  toImages(images?: TmdbImages): Prisma.ImageUncheckedCreateWithoutMovieInput[] {
    const posters = [...(images?.posters ?? [])]
      .sort((left, right) => (right.vote_average ?? 0) - (left.vote_average ?? 0))
      .slice(0, 10)
      .map((image) => ({
        filePath: this.tmdbClientService.getImageUrl(image.file_path, 'w500') ?? image.file_path,
        type: 'poster',
        width: image.width,
        height: image.height,
      }));
    const backdrops = [...(images?.backdrops ?? [])]
      .sort((left, right) => (right.vote_average ?? 0) - (left.vote_average ?? 0))
      .slice(0, 10)
      .map((image) => ({
        filePath: this.tmdbClientService.getImageUrl(image.file_path, 'w1280') ?? image.file_path,
        type: 'backdrop',
        width: image.width,
        height: image.height,
      }));

    return [...posters, ...backdrops];
  }

  toGender(value?: number | null): GenderType {
    switch (value) {
      case 1:
        return GenderType.FEMALE;
      case 2:
        return GenderType.MALE;
      case 3:
        return GenderType.NON_BINARY;
      default:
        return GenderType.UNKNOWN;
    }
  }

  private toDate(value?: string | null) {
    const normalized = this.nullableString(value);

    if (!normalized) {
      return null;
    }

    const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? new Date(`${normalized}T00:00:00.000Z`)
      : new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private nullableString(value?: string | null) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}
