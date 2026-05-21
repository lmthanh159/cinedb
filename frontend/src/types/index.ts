// ─── Shared / Primitive ───────────────────────────────────────────────────────

export interface Genre {
  id: number;
  tmdbId?: number;
  name: string;
  slug: string;
  count?: number;
}

export interface Country {
  id: number;
  isoCode: string;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logoUrl: string | null;
  originCountry: string;
}

export interface Trailer {
  id: number;
  name: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
  publishedAt: string;
}

export interface MediaImage {
  id: number;
  filePath: string;
  type: 'poster' | 'backdrop' | 'profile';
  width: number;
  height: number;
}

export interface MovieStats {
  voteAverage: number;
  voteCount: number;
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export interface PersonStub {
  id: number;
  name: string;
  profileUrl: string | null;
}

export interface CastMember {
  person: PersonStub;
  character: string;
  displayOrder: number;
}

export interface CrewMember {
  person: PersonStub;
  job: string;
  department: string;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

// ─── Movie ────────────────────────────────────────────────────────────────────

export interface MovieSummary {
  id: number;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  runtime: number | null;
  language: string | null;
  budget: string | null;
  revenue: string | null;
  status: string | null;
  voteAverage: number;
  voteCount: number;
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
  popularity: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Genre[];
}

export interface MovieDetail extends MovieSummary {
  tagline: string | null;
  cast: CastMember[];
  crew: CrewMember[];
  trailers: Trailer[];
  posters: MediaImage[];
  backdrops: MediaImage[];
  stats: MovieStats;
  countries: Country[];
  companies: ProductionCompany[];
}

export interface MovieQueryParams {
  page?: number;
  limit?: number;
  category?: 'popular' | 'now_playing' | 'upcoming' | 'top_rated';
  sort_by?: 'popularity' | 'vote_average' | 'release_date' | 'title';
  sort_order?: 'asc' | 'desc';
  genre?: string;
  year?: number;
}

export interface RateMovieResponse {
  score: number | null;
  movieVoteAverage: number;
  movieVoteCount: number;
}

// ─── TV Series ────────────────────────────────────────────────────────────────

export interface TvSummary {
  id: number;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  voteAverage: number;
  voteCount: number;
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
  popularity: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Genre[];
}

export interface Season {
  seasonNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  posterUrl: string | null;
  episodeCount: number;
  episodes?: Episode[];
}

export interface Episode {
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillUrl: string | null;
  voteAverage: number;
  voteCount: number;
}

export interface TvDetail extends TvSummary {
  seasons: Season[];
  cast: CastMember[];
  crew: CrewMember[];
  trailers: Trailer[];
  images: MediaImage[];
  stats: MovieStats;
  countries: Country[];
  companies: ProductionCompany[];
}

export interface TvQueryParams {
  page?: number;
  limit?: number;
  category?: 'popular' | 'now_playing' | 'upcoming' | 'top_rated';
  sort_by?: 'popularity' | 'vote_average' | 'first_air_date' | 'title';
  sort_order?: 'asc' | 'desc';
  genre?: string;
  year?: number;
}

export interface RateTvResponse {
  score: number | null;
  seriesVoteAverage: number;
  seriesVoteCount: number;
}

// ─── People ───────────────────────────────────────────────────────────────────

export const Gender = {
  UNKNOWN: 'UNKNOWN',
  FEMALE: 'FEMALE',
  MALE: 'MALE',
  NON_BINARY: 'NON_BINARY',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export interface Person {
  id: number;
  tmdbId: number | null;
  name: string;
  originalName: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  gender: Gender;
  profileUrl: string | null;
  popularity: number;
  knownForDepartment: string | null;
}

export type PersonDetail = Person;

export interface PersonMovieCredit {
  movie: {
    id: number;
    title: string;
    releaseDate: string | null;
    posterUrl: string | null;
  };
  character?: string;
  job?: string;
  department?: string;
}

export interface PersonTvCredit {
  series: {
    id: number;
    title: string;
    firstAirDate: string | null;
    posterUrl: string | null;
  };
  character?: string;
  job?: string;
  department?: string;
}

export interface PersonCredits {
  cast: PersonMovieCredit[];
  crew: PersonMovieCredit[];
}

export interface PersonTvCredits {
  cast: PersonTvCredit[];
  crew: PersonTvCredit[];
}

// ─── Auth & User ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  avatarUrl: string | null;
}

export interface UserProfile extends AuthUser {
  bio: string | null;
  status: string;
  emailVerified: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// ─── Ratings & Comments ───────────────────────────────────────────────────────

export interface UserRating {
  id: number;
  score: number;
  movie: { id: number; title: string; posterUrl: string | null } | null;
  series: { id: number; title: string; posterUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Review {
  rating: number;
  comment: string | null;
  user: ReviewUser;
  createdAt: string;
}

export interface Comment {
  id: number;
  content: string;
  status: string;
  movieId: number | null;
  seriesId: number | null;
  user: ReviewUser;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentData {
  content: string;
  movieId?: number;
  seriesId?: number;
}

// ─── Watchlist & Favorites ────────────────────────────────────────────────────

export interface MediaStub {
  id: number;
  title: string;
  posterUrl: string | null;
  year?: number;
  voteAverage?: number;
  voteCount?: number;
}

export interface WatchlistItem {
  id: number;
  movie: MediaStub | null;
  series: MediaStub | null;
  addedAt: string;
}

export interface FavoriteItem {
  id: number;
  movie: MediaStub | null;
  series: MediaStub | null;
  addedAt: string;
}

export interface WatchlistToggleResponse {
  inWatchlist: boolean;
}

export interface FavoriteToggleResponse {
  isFavorite: boolean;
}

// ─── Search & Discover ────────────────────────────────────────────────────────

export const MEDIA_TYPE = {
  MOVIE: 'movie',
  TV: 'tv',
  PERSON: 'person',
} as const;
export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

export interface SearchResult {
  id: number;
  title: string;
  mediaType: MediaType;
  posterUrl: string | null;
  profileUrl: string | null;
  year: number | null;
  voteAverage: number | null;
  popularity: number;
}

export interface AutocompleteResult {
  id: number;
  text: string;
  mediaType: MediaType;
  posterUrl: string | null;
  profileUrl: string | null;
}

export interface DiscoverParams {
  page?: number;
  limit?: number;
  genres?: string;
  year_min?: number;
  year_max?: number;
  country?: string;
  vote_min?: number;
  sort_by?: string;
}

// ─── Trending ─────────────────────────────────────────────────────────────────

export interface TrendingItem {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  releaseDate: string | null;
  firstAirDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  recentRatingsCount: number;
  trendingScore: number;
  genres: Genre[];
}

export type TrendingMediaType = 'movie' | 'tv' | 'all';
export type TrendingWindow = 'day' | 'week';

// ─── Pagination & API Wrappers ─────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: number;
  type: string;
  movie: MediaStub | null;
  series: MediaStub | null;
  score: number | null;
  createdAt: string;
}
