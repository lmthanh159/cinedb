import axios from 'axios';
import {
  GenderType,
  Prisma,
  type PrismaClient,
  type ProductionCompany,
} from '@prisma/client';

import {
  getRequiredEnv,
  parseDate,
  sleep,
  slugify,
  toBigInt,
} from './runtime';

const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/';

const RATE_LIMIT_INTERVAL_MS = 250;

let lastRequestAt = 0;

const tmdbClient = axios.create({
  baseURL: getRequiredEnv('TMDB_BASE_URL'),
  timeout: 30000,
  params: {
    api_key: getRequiredEnv('TMDB_API_KEY'),
  },
});

export type TmdbMovieSummary = {
  id: number;
  title: string;
  release_date?: string;
};

export type TmdbTvSummary = {
  id: number;
  name: string;
  first_air_date?: string;
};

type TmdbPaginatedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbGenreResponse = {
  genres: TmdbGenre[];
};

type TmdbVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
  published_at?: string;
};

type TmdbCastMember = {
  id: number;
  name: string;
  original_name?: string;
  character?: string;
  order?: number;
  profile_path?: string | null;
  gender?: number | null;
  known_for_department?: string | null;
  popularity?: number | null;
};

type TmdbCrewMember = {
  id: number;
  name: string;
  original_name?: string;
  job?: string | null;
  department?: string | null;
  profile_path?: string | null;
  gender?: number | null;
  known_for_department?: string | null;
  popularity?: number | null;
};

type TmdbCredits = {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
};

type TmdbProductionCountry = {
  iso_3166_1: string;
  name: string;
};

type TmdbProductionCompany = {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string | null;
};

export type TmdbMovieDetails = {
  id: number;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  original_language?: string | null;
  budget?: number | null;
  revenue?: number | null;
  status?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: TmdbGenre[];
  production_countries?: TmdbProductionCountry[];
  production_companies?: TmdbProductionCompany[];
  credits: TmdbCredits;
  videos: { results: TmdbVideo[] };
};

export type TmdbTvDetails = {
  id: number;
  name: string;
  original_name?: string | null;
  overview?: string | null;
  first_air_date?: string | null;
  last_air_date?: string | null;
  status?: string | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: TmdbGenre[];
  production_countries?: TmdbProductionCountry[];
  production_companies?: TmdbProductionCompany[];
  origin_country?: string[];
  seasons?: Array<{ season_number: number }>;
  credits: TmdbCredits;
  videos: { results: TmdbVideo[] };
};

export type TmdbSeasonDetails = {
  id: number;
  season_number: number;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  poster_path?: string | null;
  episodes: Array<{
    id: number;
    episode_number: number;
    name?: string | null;
    overview?: string | null;
    air_date?: string | null;
    runtime?: number | null;
    still_path?: string | null;
    vote_average?: number | null;
    vote_count?: number | null;
  }>;
};

async function rateLimitedRequest<T>(path: string, params?: Record<string, unknown>) {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < RATE_LIMIT_INTERVAL_MS) {
    await sleep(RATE_LIMIT_INTERVAL_MS - elapsed);
  }

  lastRequestAt = Date.now();

  const response = await tmdbClient.get<T>(path, {
    params,
  });

  return response.data;
}

export async function fetchPopularMoviesPage(page: number) {
  return rateLimitedRequest<TmdbPaginatedResponse<TmdbMovieSummary>>('/movie/popular', {
    page,
  });
}

export async function fetchPopularTvPage(page: number) {
  return rateLimitedRequest<TmdbPaginatedResponse<TmdbTvSummary>>('/tv/popular', {
    page,
  });
}

export async function fetchMovieDetails(tmdbId: number, language: string) {
  return rateLimitedRequest<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: 'credits,videos,images',
    language,
  });
}

export async function fetchTvDetails(tmdbId: number, language: string) {
  return rateLimitedRequest<TmdbTvDetails>(`/tv/${tmdbId}`, {
    append_to_response: 'credits,videos,images',
    language,
  });
}

export async function fetchSeasonDetails(
  tmdbId: number,
  seasonNumber: number,
  language: string,
) {
  return rateLimitedRequest<TmdbSeasonDetails>(`/tv/${tmdbId}/season/${seasonNumber}`, {
    language,
  });
}

export async function syncGenresFromTmdb(
  prisma: PrismaClient,
  mediaType: 'movie' | 'tv',
): Promise<Map<number, { id: number; slug: string; name: string }>> {
  const data = await rateLimitedRequest<TmdbGenreResponse>(`/genre/${mediaType}/list`, {
    language: 'en-US',
  });

  const mapping = new Map<number, { id: number; slug: string; name: string }>();

  for (const genre of data.genres) {
    const slug = slugify(genre.name);
    const record = await prisma.genre.upsert({
      where: { tmdbId: genre.id },
      update: {
        name: genre.name,
        slug,
      },
      create: {
        tmdbId: genre.id,
        name: genre.name,
        slug,
      },
    });

    mapping.set(genre.id, {
      id: record.id,
      slug: record.slug,
      name: record.name,
    });
  }

  return mapping;
}

export function buildImageUrl(size: string, path?: string | null) {
  if (!path) {
    return undefined;
  }

  return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
}

export function mapGender(value?: number | null) {
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

export function extractYear(date?: string | null) {
  if (!date) {
    return 'n/a';
  }

  return date.slice(0, 4);
}

export async function ensureCountries(
  prisma: PrismaClient,
  countries: TmdbProductionCountry[],
) {
  const connect: Array<{ isoCode: string }> = [];

  for (const country of countries) {
    if (!country.iso_3166_1) {
      continue;
    }

    await prisma.country.upsert({
      where: { isoCode: country.iso_3166_1 },
      update: { name: country.name },
      create: {
        isoCode: country.iso_3166_1,
        name: country.name,
      },
    });

    connect.push({ isoCode: country.iso_3166_1 });
  }

  return connect;
}

export async function ensureCompanies(
  prisma: PrismaClient,
  companies: TmdbProductionCompany[],
) {
  const connect: Array<{ tmdbId: number }> = [];

  for (const company of companies) {
    const record = await prisma.productionCompany.upsert({
      where: { tmdbId: company.id },
      update: {
        name: company.name,
        logoUrl: buildImageUrl('w500', company.logo_path),
        originCountry: company.origin_country || undefined,
      },
      create: {
        tmdbId: company.id,
        name: company.name,
        logoUrl: buildImageUrl('w500', company.logo_path),
        originCountry: company.origin_country || undefined,
      },
    });

    connect.push({ tmdbId: record.tmdbId ?? company.id });
  }

  return connect;
}

export async function upsertPerson(
  prisma: PrismaClient,
  person: TmdbCastMember | TmdbCrewMember,
) {
  return prisma.person.upsert({
    where: { tmdbId: person.id },
    update: {
      name: person.name,
      originalName: person.original_name || undefined,
      profileUrl: buildImageUrl('w185', person.profile_path),
      gender: mapGender(person.gender),
      popularity: person.popularity ?? 0,
      knownForDepartment: person.known_for_department || undefined,
      tmdbLastSynced: new Date(),
    },
    create: {
      tmdbId: person.id,
      name: person.name,
      originalName: person.original_name || undefined,
      profileUrl: buildImageUrl('w185', person.profile_path),
      gender: mapGender(person.gender),
      popularity: person.popularity ?? 0,
      knownForDepartment: person.known_for_department || undefined,
      tmdbLastSynced: new Date(),
    },
  });
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

export async function importMovieIntoDatabase(
  prisma: PrismaClient,
  details: TmdbMovieDetails,
  viDetails: TmdbMovieDetails,
  peopleImported: Set<number>,
) {
  const castMembers = dedupeByKey(details.credits.cast.slice(0, 15), (member) => {
    return `${member.id}:${member.character ?? ''}`;
  });
  const crewMembers = dedupeByKey(
    details.credits.crew.filter((member) =>
      ['Director', 'Writer', 'Producer'].includes(member.job ?? ''),
    ),
    (member) => `${member.id}:${member.job ?? ''}`,
  );
  const trailers = dedupeByKey(
    details.videos.results.filter(
      (video) =>
        video.site === 'YouTube' &&
        (video.type === 'Trailer' || video.type === 'Teaser'),
    ),
    (video) => `${video.site}:${video.key}:${video.type}`,
  );
  const genreConnect = (details.genres ?? []).map((genre) => ({ tmdbId: genre.id }));
  const countryConnect = await ensureCountries(prisma, details.production_countries ?? []);
  const companyConnect = await ensureCompanies(prisma, details.production_companies ?? []);

  const movie = await prisma.movie.upsert({
    where: { tmdbId: details.id },
    update: {
      title: viDetails.title || details.title,
      originalTitle: details.original_title || undefined,
      overview: (viDetails.overview || details.overview || '').trim() || undefined,
      releaseDate: parseDate(details.release_date),
      runtime: details.runtime ?? undefined,
      language: details.original_language || undefined,
      budget: toBigInt(details.budget),
      revenue: toBigInt(details.revenue),
      status: details.status || undefined,
      tmdbVoteAverage: details.vote_average ?? 0,
      tmdbVoteCount: details.vote_count ?? 0,
      popularity: details.popularity ?? 0,
      posterUrl: buildImageUrl('w500', details.poster_path),
      backdropUrl: buildImageUrl('w1280', details.backdrop_path),
      tmdbLastSynced: new Date(),
      genres: { set: genreConnect },
      countries: { set: countryConnect },
      companies: { set: companyConnect },
    },
    create: {
      tmdbId: details.id,
      title: viDetails.title || details.title,
      originalTitle: details.original_title || undefined,
      overview: (viDetails.overview || details.overview || '').trim() || undefined,
      releaseDate: parseDate(details.release_date),
      runtime: details.runtime ?? undefined,
      language: details.original_language || undefined,
      budget: toBigInt(details.budget),
      revenue: toBigInt(details.revenue),
      status: details.status || undefined,
      tmdbVoteAverage: details.vote_average ?? 0,
      tmdbVoteCount: details.vote_count ?? 0,
      popularity: details.popularity ?? 0,
      posterUrl: buildImageUrl('w500', details.poster_path),
      backdropUrl: buildImageUrl('w1280', details.backdrop_path),
      tmdbLastSynced: new Date(),
      genres: { connect: genreConnect },
      countries: { connect: countryConnect },
      companies: { connect: companyConnect },
    },
  });

  await prisma.movieCast.deleteMany({
    where: { movieId: movie.id },
  });
  await prisma.movieCrew.deleteMany({
    where: { movieId: movie.id },
  });
  await prisma.trailer.deleteMany({
    where: { movieId: movie.id },
  });

  for (const member of castMembers) {
    const person = await upsertPerson(prisma, member);
    peopleImported.add(member.id);

    await prisma.movieCast.create({
      data: {
        movieId: movie.id,
        personId: person.id,
        character: member.character || undefined,
        displayOrder: member.order ?? 0,
      },
    });
  }

  for (const member of crewMembers) {
    const person = await upsertPerson(prisma, member);
    peopleImported.add(member.id);

    await prisma.movieCrew.create({
      data: {
        movieId: movie.id,
        personId: person.id,
        job: member.job || undefined,
        department: member.department || undefined,
      },
    });
  }

  if (trailers.length > 0) {
    await prisma.trailer.createMany({
      data: trailers.map((video) => ({
        movieId: movie.id,
        name: video.name || undefined,
        key: video.key,
        site: video.site,
        type: video.type || undefined,
        official: video.official ?? false,
        publishedAt: parseDate(video.published_at),
      })),
    });
  }
}

export async function importTvSeriesIntoDatabase(
  prisma: PrismaClient,
  details: TmdbTvDetails,
  viDetails: TmdbTvDetails,
  peopleImported: Set<number>,
) {
  const castMembers = dedupeByKey(details.credits.cast.slice(0, 15), (member) => {
    return `${member.id}:${member.character ?? ''}`;
  });
  const crewMembers = dedupeByKey(
    details.credits.crew.filter((member) =>
      ['Director', 'Writer', 'Producer'].includes(member.job ?? ''),
    ),
    (member) => `${member.id}:${member.job ?? ''}`,
  );
  const trailers = dedupeByKey(
    details.videos.results.filter(
      (video) =>
        video.site === 'YouTube' &&
        (video.type === 'Trailer' || video.type === 'Teaser'),
    ),
    (video) => `${video.site}:${video.key}:${video.type}`,
  );
  const genreConnect = (details.genres ?? []).map((genre) => ({ tmdbId: genre.id }));
  const countrySource =
    details.production_countries && details.production_countries.length > 0
      ? details.production_countries
      : (details.origin_country ?? []).map((code) => ({
          iso_3166_1: code,
          name: code,
        }));
  const countryConnect = await ensureCountries(prisma, countrySource);
  const companyConnect = await ensureCompanies(prisma, details.production_companies ?? []);

  const series = await prisma.tVSeries.upsert({
    where: { tmdbId: details.id },
    update: {
      title: viDetails.name || details.name,
      originalTitle: details.original_name || undefined,
      overview: (viDetails.overview || details.overview || '').trim() || undefined,
      firstAirDate: parseDate(details.first_air_date),
      lastAirDate: parseDate(details.last_air_date),
      status: details.status || undefined,
      numberOfSeasons: details.number_of_seasons ?? 0,
      numberOfEpisodes: details.number_of_episodes ?? 0,
      tmdbVoteAverage: details.vote_average ?? 0,
      tmdbVoteCount: details.vote_count ?? 0,
      popularity: details.popularity ?? 0,
      posterUrl: buildImageUrl('w500', details.poster_path),
      backdropUrl: buildImageUrl('w1280', details.backdrop_path),
      tmdbLastSynced: new Date(),
      genres: { set: genreConnect },
      countries: { set: countryConnect },
      companies: { set: companyConnect },
    },
    create: {
      tmdbId: details.id,
      title: viDetails.name || details.name,
      originalTitle: details.original_name || undefined,
      overview: (viDetails.overview || details.overview || '').trim() || undefined,
      firstAirDate: parseDate(details.first_air_date),
      lastAirDate: parseDate(details.last_air_date),
      status: details.status || undefined,
      numberOfSeasons: details.number_of_seasons ?? 0,
      numberOfEpisodes: details.number_of_episodes ?? 0,
      tmdbVoteAverage: details.vote_average ?? 0,
      tmdbVoteCount: details.vote_count ?? 0,
      popularity: details.popularity ?? 0,
      posterUrl: buildImageUrl('w500', details.poster_path),
      backdropUrl: buildImageUrl('w1280', details.backdrop_path),
      tmdbLastSynced: new Date(),
      genres: { connect: genreConnect },
      countries: { connect: countryConnect },
      companies: { connect: companyConnect },
    },
  });

  await prisma.seriesCast.deleteMany({
    where: { seriesId: series.id },
  });
  await prisma.seriesCrew.deleteMany({
    where: { seriesId: series.id },
  });
  await prisma.trailer.deleteMany({
    where: { seriesId: series.id },
  });

  for (const member of castMembers) {
    const person = await upsertPerson(prisma, member);
    peopleImported.add(member.id);

    await prisma.seriesCast.create({
      data: {
        seriesId: series.id,
        personId: person.id,
        character: member.character || undefined,
        displayOrder: member.order ?? 0,
      },
    });
  }

  for (const member of crewMembers) {
    const person = await upsertPerson(prisma, member);
    peopleImported.add(member.id);

    await prisma.seriesCrew.create({
      data: {
        seriesId: series.id,
        personId: person.id,
        job: member.job || undefined,
        department: member.department || undefined,
      },
    });
  }

  if (trailers.length > 0) {
    await prisma.trailer.createMany({
      data: trailers.map((video) => ({
        seriesId: series.id,
        name: video.name || undefined,
        key: video.key,
        site: video.site,
        type: video.type || undefined,
        official: video.official ?? false,
        publishedAt: parseDate(video.published_at),
      })),
    });
  }

  return series;
}

export async function upsertSeasonsAndEpisodes(
  prisma: PrismaClient,
  seriesId: number,
  seasonDetails: TmdbSeasonDetails[],
) {
  for (const detail of seasonDetails) {
    const season = await prisma.season.upsert({
      where: {
        seriesId_seasonNumber: {
          seriesId,
          seasonNumber: detail.season_number,
        },
      },
      update: {
        tmdbId: detail.id,
        name: detail.name || undefined,
        overview: detail.overview || undefined,
        airDate: parseDate(detail.air_date),
        posterUrl: buildImageUrl('w500', detail.poster_path),
        episodeCount: detail.episodes.length,
      },
      create: {
        seriesId,
        tmdbId: detail.id,
        seasonNumber: detail.season_number,
        name: detail.name || undefined,
        overview: detail.overview || undefined,
        airDate: parseDate(detail.air_date),
        posterUrl: buildImageUrl('w500', detail.poster_path),
        episodeCount: detail.episodes.length,
      },
    });

    await prisma.episode.deleteMany({
      where: { seasonId: season.id },
    });

    if (detail.episodes.length > 0) {
      await prisma.episode.createMany({
        data: detail.episodes.map((episode) => ({
          seasonId: season.id,
          tmdbId: episode.id,
          episodeNumber: episode.episode_number,
          name: episode.name || undefined,
          overview: episode.overview || undefined,
          airDate: parseDate(episode.air_date),
          runtime: episode.runtime ?? undefined,
          stillUrl: buildImageUrl('w500', episode.still_path),
          voteAverage: episode.vote_average ?? 0,
          voteCount: episode.vote_count ?? 0,
        })),
      });
    }
  }
}

export function createSyncLogData(syncType: string, entityType: string) {
  return {
    syncType,
    entityType,
    startedAt: new Date(),
    status: 'running',
  } satisfies Prisma.TmdbSyncLogUncheckedCreateInput;
}

