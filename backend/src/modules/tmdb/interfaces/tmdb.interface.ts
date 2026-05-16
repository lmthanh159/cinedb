export type TmdbMediaType = 'movie' | 'tv' | 'person' | 'all';
export type TmdbTimeWindow = 'day' | 'week';
export type TmdbImageSize =
  | 'w92'
  | 'w185'
  | 'w342'
  | 'w500'
  | 'w780'
  | 'w1280'
  | 'original';

export type TmdbPaginatedResponse<T = TmdbMovie | TmdbTVSeries | TmdbPerson> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbGenresResponse = {
  genres: TmdbGenre[];
};

export type TmdbProductionCompany = {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
};

export type TmdbProductionCountry = {
  iso_3166_1: string;
  name: string;
};

export type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
};

export type TmdbMovieDetail = TmdbMovie & {
  budget: number;
  revenue: number;
  runtime: number | null;
  status: string | null;
  original_language: string;
  genres: TmdbGenre[];
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  credits?: TmdbCredits;
  videos?: TmdbVideos;
  images?: TmdbImages;
};

export type TmdbTVSeries = {
  id: number;
  name: string;
  original_name: string;
  overview: string | null;
  first_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
};

export type TmdbTVDetail = TmdbTVSeries & {
  created_by: Array<{
    id: number;
    name: string;
    profile_path: string | null;
  }>;
  episode_run_time: number[];
  genres: TmdbGenre[];
  last_air_date: string | null;
  number_of_episodes: number;
  number_of_seasons: number;
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  seasons: Array<{
    id: number;
    air_date: string | null;
    episode_count: number;
    name: string;
    overview: string | null;
    poster_path: string | null;
    season_number: number;
  }>;
  status: string | null;
  credits?: TmdbCredits;
  videos?: TmdbVideos;
  images?: TmdbImages;
};

export type TmdbSeasonDetail = {
  id: number;
  air_date: string | null;
  name: string;
  overview: string | null;
  poster_path: string | null;
  season_number: number;
  episodes: TmdbEpisode[];
};

export type TmdbEpisode = {
  id: number;
  name: string;
  overview: string | null;
  air_date: string | null;
  episode_number: number;
  runtime: number | null;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
};

export type TmdbPerson = {
  id: number;
  name: string;
  original_name?: string;
  profile_path: string | null;
  popularity: number;
  known_for_department?: string;
};

export type TmdbPersonDetail = TmdbPerson & {
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  gender: number;
  place_of_birth: string | null;
  movie_credits?: TmdbCredits;
  tv_credits?: TmdbCredits;
  images?: TmdbImages;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  original_name?: string;
  character?: string;
  order?: number;
  profile_path: string | null;
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  original_name?: string;
  department?: string;
  job?: string;
  profile_path: string | null;
};

export type TmdbCredits = {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
};

export type TmdbVideo = {
  id: string;
  name: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string | null;
};

export type TmdbVideos = {
  results: TmdbVideo[];
};

export type TmdbImage = {
  file_path: string;
  width: number;
  height: number;
  vote_average?: number;
  vote_count?: number;
};

export type TmdbImages = {
  posters: TmdbImage[];
  backdrops: TmdbImage[];
  profiles?: TmdbImage[];
};

export type TmdbChanges = {
  page: number;
  results: Array<{
    id: number;
    adult?: boolean;
  }>;
  total_pages: number;
  total_results: number;
};
