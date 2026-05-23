export const ROUTES = {
  HOME: '/',
  MOVIES: '/movies',
  MOVIE: (id: number) => `/movie/${id}`,
  TV: '/tv',
  TV_SHOW: (id: number) => `/tv/${id}`,
  TV_SEASON: (id: number, season: number) => `/tv/${id}/season/${season}`,
  PEOPLE: '/people',
  PERSON: (id: number) => `/person/${id}`,
  SEARCH: '/search',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_EMAIL: '/verify-email',
  PROFILE: '/profile',
  WATCHLIST: '/watchlist',
  FAVORITES: '/favorites',
  RATINGS: '/ratings',
  ACTIVITY: '/activity',
  ADMIN: '/admin',
} as const;

export const IMAGE_SIZES = {
  POSTER_SM: 'w185',
  POSTER_MD: 'w342',
  POSTER_LG: 'w500',
  BACKDROP_SM: 'w780',
  BACKDROP_LG: 'w1280',
  BACKDROP_ORIGINAL: 'original',
  PROFILE: 'w185',
  PROFILE_LG: 'h632',
} as const;

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const LS_KEYS = {
  REFRESH_TOKEN: 'cinedb-refresh-token',
} as const;

export const API_DEFAULTS = {
  PAGE_SIZE: 20,
  CAROUSEL_SIZE: 10,
  AUTOCOMPLETE_LIMIT: 5,
  SEARCH_DEBOUNCE_MS: 300,
} as const;
