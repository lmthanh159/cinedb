import axios from 'axios';

import type {
  AdminComment,
  AdminCommentsResponse,
  AdminGenre,
  AdminGenresResponse,
  AdminPerson,
  AdminPeopleResponse,
  AdminStats,
  AdminUser,
  AdminUsersResponse,
  ApiResponse,
  AuthTokens,
  AutocompleteResult,
  Comment,
  CreateCommentData,
  Credits,
  DiscoverParams,
  Episode,
  FavoriteItem,
  FavoriteToggleResponse,
  GenreDistributionItem,
  LoginData,
  MediaImage,
  MovieDetail,
  MovieQueryParams,
  MovieSummary,
  PaginatedResponse,
  PaginationParams,
  Person,
  PersonCredits,
  PersonDetail,
  PersonTvCredits,
  RateMovieResponse,
  RateTvResponse,
  RatingsChartPoint,
  RegisterData,
  Review,
  SearchResult,
  Season,
  TopMovieChartItem,
  Trailer,
  TrendingItem,
  TrendingMediaType,
  TrendingWindow,
  TvDetail,
  TvQueryParams,
  TvSummary,
  ActivityItem,
  UserProfile,
  UserRating,
  WatchlistItem,
  WatchlistToggleResponse,
  SyncLogsResponse,
  TmdbFullImportResult,
  TmdbImportStats,
  TmdbMovieSearchResult,
  TmdbPaginatedResult,
  TmdbTvSearchResult,
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Request interceptor: attach access token from memory ─────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Lazy require avoids module-init circular dependency
    const { useAuthStore } = require('@/store/auth-store') as typeof import('@/store/auth-store');
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor: 401 → refresh → retry ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: import('axios').AxiosError) => {
    const originalRequest = error.config as import('axios').InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { useAuthStore } = require('@/store/auth-store') as typeof import('@/store/auth-store');
        const newToken = await useAuthStore.getState().refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        const { useAuthStore } = require('@/store/auth-store') as typeof import('@/store/auth-store');
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: RegisterData) =>
    api.post<ApiResponse<{ message: string }>>('/auth/register', data),

  login: (data: LoginData) => api.post<ApiResponse<AuthTokens>>('/auth/login', data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', { refreshToken }),

  logout: (refreshToken?: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/logout', refreshToken ? { refreshToken } : {}),

  getMe: () => api.get<ApiResponse<import('@/types').AuthUser>>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, newPassword }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/change-password', { oldPassword, newPassword }),

  verifyEmail: (token: string) =>
    api.get<ApiResponse<{ message: string }>>('/auth/verify-email', { params: { token } }),
};

// ─── Movies ───────────────────────────────────────────────────────────────────
export const movieApi = {
  getMovies: (params?: MovieQueryParams) =>
    api.get<PaginatedResponse<MovieSummary>>('/movies', { params }),

  getMovie: (id: number) => api.get<ApiResponse<MovieDetail>>(`/movies/${id}`),

  getMovieCredits: (id: number) => api.get<ApiResponse<Credits>>(`/movies/${id}/credits`),

  getMovieImages: (id: number) =>
    api.get<ApiResponse<{ posters: MediaImage[]; backdrops: MediaImage[] }>>(`/movies/${id}/images`),

  getMovieVideos: (id: number) =>
    api.get<ApiResponse<{ results: Trailer[] }>>(`/movies/${id}/videos`),

  getMovieSimilar: (id: number) =>
    api.get<ApiResponse<MovieSummary[]>>(`/movies/${id}/similar`),

  getMovieReviews: (id: number, params?: PaginationParams & { sort_by?: string; sort_order?: string }) =>
    api.get<PaginatedResponse<Review>>(`/movies/${id}/reviews`, { params }),

  rateMovie: (id: number, score: number) =>
    api.post<ApiResponse<RateMovieResponse>>(`/movies/${id}/rating`, { score }),

  deleteRating: (id: number) =>
    api.delete<ApiResponse<RateMovieResponse>>(`/movies/${id}/rating`),

  addToWatchlist: (id: number) =>
    api.post<ApiResponse<WatchlistToggleResponse>>(`/movies/${id}/watchlist`),

  removeFromWatchlist: (id: number) =>
    api.delete<ApiResponse<WatchlistToggleResponse>>(`/movies/${id}/watchlist`),

  addToFavorite: (id: number) =>
    api.post<ApiResponse<FavoriteToggleResponse>>(`/movies/${id}/favorite`),

  removeFromFavorite: (id: number) =>
    api.delete<ApiResponse<FavoriteToggleResponse>>(`/movies/${id}/favorite`),
};

// ─── TV Series ────────────────────────────────────────────────────────────────
export const tvApi = {
  getTvShows: (params?: TvQueryParams) =>
    api.get<PaginatedResponse<TvSummary>>('/tv', { params }),

  getTvShow: (id: number) => api.get<ApiResponse<TvDetail>>(`/tv/${id}`),

  getTvCredits: (id: number) => api.get<ApiResponse<Credits>>(`/tv/${id}/credits`),

  getTvVideos: (id: number) =>
    api.get<ApiResponse<{ results: Trailer[] }>>(`/tv/${id}/videos`),

  getTvSimilar: (id: number) =>
    api.get<ApiResponse<TvSummary[]>>(`/tv/${id}/similar`),

  getTvReviews: (id: number, params?: PaginationParams & { sort_by?: string; sort_order?: string }) =>
    api.get<PaginatedResponse<Review>>(`/tv/${id}/reviews`, { params }),

  getSeason: (id: number, seasonNumber: number) =>
    api.get<ApiResponse<Season>>(`/tv/${id}/season/${seasonNumber}`),

  getEpisode: (id: number, seasonNumber: number, episodeNumber: number) =>
    api.get<ApiResponse<Episode>>(`/tv/${id}/season/${seasonNumber}/episode/${episodeNumber}`),

  rateTv: (id: number, score: number) =>
    api.post<ApiResponse<RateTvResponse>>(`/tv/${id}/rating`, { score }),

  deleteTvRating: (id: number) =>
    api.delete<ApiResponse<RateTvResponse>>(`/tv/${id}/rating`),

  addTvToWatchlist: (id: number) =>
    api.post<ApiResponse<WatchlistToggleResponse>>(`/tv/${id}/watchlist`),

  removeTvFromWatchlist: (id: number) =>
    api.delete<ApiResponse<WatchlistToggleResponse>>(`/tv/${id}/watchlist`),

  addTvToFavorite: (id: number) =>
    api.post<ApiResponse<FavoriteToggleResponse>>(`/tv/${id}/favorite`),

  removeTvFromFavorite: (id: number) =>
    api.delete<ApiResponse<FavoriteToggleResponse>>(`/tv/${id}/favorite`),
};

// ─── People ───────────────────────────────────────────────────────────────────
export const peopleApi = {
  getPeople: (params?: PaginationParams) =>
    api.get<PaginatedResponse<Person>>('/person/popular', { params }),

  getPerson: (id: number) => api.get<ApiResponse<PersonDetail>>(`/person/${id}`),

  getPersonMovieCredits: (id: number) =>
    api.get<ApiResponse<PersonCredits>>(`/person/${id}/movie-credits`),

  getPersonTvCredits: (id: number) =>
    api.get<ApiResponse<PersonTvCredits>>(`/person/${id}/tv-credits`),

  getPersonImages: (id: number) =>
    api.get<ApiResponse<{ images: MediaImage[] }>>(`/person/${id}/images`),
};

// ─── Search & Discover ────────────────────────────────────────────────────────
export const searchApi = {
  multiSearch: (query: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<SearchResult>>('/search/multi', { params: { query, ...params } }),

  searchMovies: (query: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<SearchResult>>('/search/movie', { params: { query, ...params } }),

  searchTv: (query: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<SearchResult>>('/search/tv', { params: { query, ...params } }),

  searchPeople: (query: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<SearchResult>>('/search/person', { params: { query, ...params } }),

  autocomplete: (query: string, limit = 5) =>
    api.get<ApiResponse<AutocompleteResult[]>>('/search/autocomplete', { params: { query, limit } }),

  discoverMovies: (params: DiscoverParams) =>
    api.get<PaginatedResponse<SearchResult>>('/discover/movie', { params }),

  discoverTv: (params: DiscoverParams) =>
    api.get<PaginatedResponse<SearchResult>>('/discover/tv', { params }),
};

// ─── Trending ─────────────────────────────────────────────────────────────────
export const trendingApi = {
  getTrending: (mediaType: TrendingMediaType, timeWindow: TrendingWindow, params?: PaginationParams) =>
    api.get<PaginatedResponse<TrendingItem>>(`/trending/${mediaType}/${timeWindow}`, { params }),
};

// ─── Genres ───────────────────────────────────────────────────────────────────
export const genreApi = {
  getMovieGenres: () => api.get<ApiResponse<import('@/types').Genre[]>>('/genres/movie'),
  getTvGenres: () => api.get<ApiResponse<import('@/types').Genre[]>>('/genres/tv'),
};

// ─── Users & Collections ──────────────────────────────────────────────────────
export const userApi = {
  getMe: () => api.get<ApiResponse<UserProfile>>('/users/me'),

  updateProfile: (data: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl' | 'language'> & { bio: string }>) =>
    api.patch<ApiResponse<UserProfile>>('/users/me', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch<ApiResponse<{ message: string }>>('/users/me/password', { oldPassword, newPassword }),

  getWatchlist: (params?: PaginationParams) =>
    api.get<PaginatedResponse<WatchlistItem>>('/users/me/watchlist', { params }),

  getFavorites: (params?: PaginationParams) =>
    api.get<PaginatedResponse<FavoriteItem>>('/users/me/favorites', { params }),

  getRatings: (params?: PaginationParams) =>
    api.get<PaginatedResponse<UserRating>>('/users/me/ratings', { params }),

  getActivity: (params?: PaginationParams) =>
    api.get<PaginatedResponse<ActivityItem>>('/users/me/activity', { params }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  tmdbImportFull: (moviePages: number, tvPages: number) =>
    api.post<ApiResponse<TmdbFullImportResult>>('/admin/tmdb/import/full', { moviePages, tvPages }),

  tmdbImportMovie: (tmdbId: number) =>
    api.post<ApiResponse<TmdbImportStats>>(`/admin/tmdb/import/movie/${tmdbId}`),

  tmdbImportTv: (tmdbId: number) =>
    api.post<ApiResponse<TmdbImportStats>>(`/admin/tmdb/import/tv/${tmdbId}`),

  tmdbSearchMovies: (query: string, page = 1) =>
    api.get<ApiResponse<TmdbPaginatedResult<TmdbMovieSearchResult>>>('/admin/tmdb/search/movie', {
      params: { query, page },
    }),

  tmdbSearchTv: (query: string, page = 1) =>
    api.get<ApiResponse<TmdbPaginatedResult<TmdbTvSearchResult>>>('/admin/tmdb/search/tv', {
      params: { query, page },
    }),

  tmdbSyncDaily: () =>
    api.post<ApiResponse<TmdbFullImportResult>>('/admin/tmdb/sync/daily'),

  tmdbSyncLogs: (params?: { page?: number; limit?: number; syncType?: string; entityType?: string }) =>
    api.get<SyncLogsResponse>('/admin/tmdb/sync/logs', { params }),

  deleteMovie: (id: number) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/movies/${id}`),

  deleteTv: (id: number) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/tv/${id}`),

  // ─── Stats & Charts ─────────────────────────────────────────────────────────

  getStats: () =>
    api.get<ApiResponse<AdminStats>>('/admin/stats'),

  getChartRatings: (days = 30) =>
    api.get<ApiResponse<RatingsChartPoint[]>>('/admin/charts/ratings', { params: { days } }),

  getChartTopMovies: (days = 30, limit = 10) =>
    api.get<ApiResponse<TopMovieChartItem[]>>('/admin/charts/top-movies', { params: { days, limit } }),

  getChartGenreDistribution: (limit = 10) =>
    api.get<ApiResponse<GenreDistributionItem[]>>('/admin/charts/genre-distribution', { params: { limit } }),

  // ─── Users ──────────────────────────────────────────────────────────────────

  getUsers: (params?: { page?: number; limit?: number; q?: string; role?: string; status?: string }) =>
    api.get<AdminUsersResponse>('/admin/users', { params }),

  updateUser: (id: string, data: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'LOCKED' | 'UNVERIFIED'; displayName?: string; emailVerified?: boolean }) =>
    api.patch<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),

  lockUser: (id: string, minutes: number, reason: string) =>
    api.post<ApiResponse<AdminUser>>(`/admin/users/${id}/lock`, { minutes, reason }),

  unlockUser: (id: string) =>
    api.post<ApiResponse<AdminUser>>(`/admin/users/${id}/unlock`),

  // ─── Comments ───────────────────────────────────────────────────────────────

  getComments: (params?: { page?: number; limit?: number; status?: string; q?: string; reportedOnly?: boolean }) =>
    api.get<AdminCommentsResponse>('/admin/comments', { params }),

  hideComment: (id: number, resolveReports = true) =>
    api.post<ApiResponse<AdminComment>>(`/admin/comments/${id}/hide`, { resolveReports }),

  restoreComment: (id: number) =>
    api.post<ApiResponse<AdminComment>>(`/admin/comments/${id}/restore`),

  deleteAdminComment: (id: number) =>
    api.delete<ApiResponse<AdminComment>>(`/admin/comments/${id}`),

  // ─── People ─────────────────────────────────────────────────────────────────

  getPeople: (params?: { page?: number; limit?: number; q?: string; sort_by?: string; sort_order?: string }) =>
    api.get<AdminPeopleResponse>('/admin/people', { params }),

  createPerson: (data: {
    name: string;
    originalName?: string | null;
    biography?: string | null;
    birthday?: string | null;
    deathday?: string | null;
    placeOfBirth?: string | null;
    gender?: AdminPerson['gender'];
    profileUrl?: string | null;
    knownForDepartment?: string;
  }) => api.post<ApiResponse<AdminPerson>>('/admin/people', data),

  updatePerson: (id: number, data: {
    name?: string;
    originalName?: string | null;
    biography?: string | null;
    birthday?: string | null;
    deathday?: string | null;
    placeOfBirth?: string | null;
    gender?: AdminPerson['gender'];
    profileUrl?: string | null;
    knownForDepartment?: string;
  }) => api.put<ApiResponse<AdminPerson>>(`/admin/people/${id}`, data),

  deletePerson: (id: number) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/people/${id}`),

  // ─── Genres ─────────────────────────────────────────────────────────────────

  getAdminGenres: (params?: { page?: number; limit?: number; q?: string }) =>
    api.get<AdminGenresResponse>('/admin/genres', { params }),

  createGenre: (data: { name: string; slug?: string; tmdbId?: number | null }) =>
    api.post<ApiResponse<AdminGenre>>('/admin/genres', data),

  updateGenre: (id: number, data: { name?: string; slug?: string; tmdbId?: number | null }) =>
    api.patch<ApiResponse<AdminGenre>>(`/admin/genres/${id}`, data),

  deleteGenre: (id: number) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/genres/${id}`),
};

// ─── Comments ─────────────────────────────────────────────────────────────────
export const commentApi = {
  createComment: (data: CreateCommentData) =>
    api.post<ApiResponse<Comment>>('/comments', data),

  updateComment: (id: number, content: string) =>
    api.patch<ApiResponse<Comment>>(`/comments/${id}`, { content }),

  deleteComment: (id: number) =>
    api.delete<ApiResponse<{ message: string }>>(`/comments/${id}`),

  reportComment: (id: number, reason: string) =>
    api.post<ApiResponse<{ id: number; status: string; message: string }>>(`/comments/${id}/report`, { reason }),
};
