export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface Rating {
  id: number;
  score: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
}

export interface Movie {
  id: number;
  tmdbId?: number;
  title: string;
  overview?: string;
  posterUrl?: string;
  releaseDate?: string;
  genres?: Genre[];
  rating?: Rating;
}

export interface TVSeries {
  id: number;
  tmdbId?: number;
  title: string;
  overview?: string;
  posterUrl?: string;
  firstAirDate?: string;
  genres?: Genre[];
  rating?: Rating;
}

export interface Person {
  id: number;
  tmdbId?: number;
  name: string;
  biography?: string;
  profileUrl?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
}

