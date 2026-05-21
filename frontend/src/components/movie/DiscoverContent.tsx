'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';

import { Button, Pagination } from '@/components/ui';
import { genreApi, searchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DiscoverParams, Genre, SearchResult } from '@/types';

import { SearchResultGrid } from './SearchResultGrid';

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS_MOVIE = [
  { value: 'popularity.desc', label: 'Phổ biến nhất' },
  { value: 'vote_average.desc', label: 'Đánh giá cao nhất' },
  { value: 'release_date.desc', label: 'Mới nhất' },
  { value: 'release_date.asc', label: 'Cũ nhất' },
  { value: 'title.asc', label: 'Tên A-Z' },
] as const;

const SORT_OPTIONS_TV = [
  { value: 'popularity.desc', label: 'Phổ biến nhất' },
  { value: 'vote_average.desc', label: 'Đánh giá cao nhất' },
  { value: 'first_air_date.desc', label: 'Mới nhất' },
  { value: 'first_air_date.asc', label: 'Cũ nhất' },
  { value: 'title.asc', label: 'Tên A-Z' },
] as const;

const POPULAR_COUNTRIES = [
  { code: 'US', name: 'Mỹ' },
  { code: 'GB', name: 'Anh' },
  { code: 'KR', name: 'Hàn Quốc' },
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'CN', name: 'Trung Quốc' },
  { code: 'FR', name: 'Pháp' },
  { code: 'IT', name: 'Ý' },
  { code: 'DE', name: 'Đức' },
  { code: 'IN', name: 'Ấn Độ' },
  { code: 'VN', name: 'Việt Nam' },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i);
const PAGE_SIZE = 20;

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  genres: number[];
  yearMin: string;
  yearMax: string;
  country: string;
  voteMin: string;
}

function parseFilters(params: URLSearchParams): FilterState {
  const genresRaw = params.get('genres');
  return {
    genres: genresRaw
      ? genresRaw.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
      : [],
    yearMin: params.get('year_min') ?? '',
    yearMax: params.get('year_max') ?? '',
    country: params.get('country') ?? '',
    voteMin: params.get('vote_min') ?? '',
  };
}

// ─── FilterSidebar ────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  genres: Genre[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  onClear: () => void;
}

function FilterSidebar({ genres, filters, onChange, onApply, onClear }: FilterSidebarProps) {
  const toggleGenre = (id: number) => {
    const next = filters.genres.includes(id)
      ? filters.genres.filter((g) => g !== id)
      : [...filters.genres, id];
    onChange({ ...filters, genres: next });
  };

  const selectClass =
    'rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Thể loại
        </p>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filters.genres.includes(genre.id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
              )}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {/* Year range */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Năm sản xuất
        </p>
        <div className="flex items-center gap-2">
          <select
            value={filters.yearMin}
            onChange={(e) => onChange({ ...filters, yearMin: e.target.value })}
            className={cn(selectClass, 'flex-1')}
            aria-label="Năm từ"
          >
            <option value="">Từ</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-slate-500">—</span>
          <select
            value={filters.yearMax}
            onChange={(e) => onChange({ ...filters, yearMax: e.target.value })}
            className={cn(selectClass, 'flex-1')}
            aria-label="Năm đến"
          >
            <option value="">Đến</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Country */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quốc gia
        </p>
        <select
          value={filters.country}
          onChange={(e) => onChange({ ...filters, country: e.target.value })}
          className={cn(selectClass, 'w-full')}
          aria-label="Quốc gia"
        >
          <option value="">Tất cả</option>
          {POPULAR_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Vote min */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Điểm tối thiểu
        </p>
        <select
          value={filters.voteMin}
          onChange={(e) => onChange({ ...filters, voteMin: e.target.value })}
          className={cn(selectClass, 'w-full')}
          aria-label="Điểm tối thiểu"
        >
          <option value="">Bất kỳ</option>
          {[5, 6, 7, 8, 9].map((v) => (
            <option key={v} value={v}>{v}+</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={onApply} className="flex-1">Áp dụng</Button>
        <Button variant="ghost" onClick={onClear} className="flex-1">Xóa bộ lọc</Button>
      </div>
    </div>
  );
}

// ─── Main content (uses useSearchParams → needs Suspense) ─────────────────────

export interface DiscoverContentProps {
  mediaType: 'movie' | 'tv';
}

function DiscoverMain({ mediaType }: DiscoverContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortOptions = mediaType === 'movie' ? SORT_OPTIONS_MOVIE : SORT_OPTIONS_TV;
  const basePath = `/discover/${mediaType}`;
  const pageTitle = mediaType === 'movie' ? 'Khám phá Phim' : 'Khám phá TV Shows';

  const [genres, setGenres] = useState<Genre[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(() =>
    parseFilters(searchParams),
  );

  // Fetch genres once per mediaType
  useEffect(() => {
    const req = mediaType === 'movie' ? genreApi.getMovieGenres() : genreApi.getTvGenres();
    req.then((res) => setGenres(res.data.data)).catch(() => {});
  }, [mediaType]);

  // Fetch results whenever URL params change
  useEffect(() => {
    const page = Number(searchParams.get('page') ?? '1');
    const sortBy = searchParams.get('sort_by') ?? 'popularity.desc';
    const filters = parseFilters(searchParams);

    let cancelled = false;

    const params: DiscoverParams = { page, limit: PAGE_SIZE, sort_by: sortBy };
    if (filters.genres.length > 0) params.genres = filters.genres.join(',');
    if (filters.yearMin) params.year_min = Number(filters.yearMin);
    if (filters.yearMax) params.year_max = Number(filters.yearMax);
    if (filters.country) params.country = filters.country;
    if (filters.voteMin) params.vote_min = Number(filters.voteMin);

    const req = mediaType === 'movie'
      ? searchApi.discoverMovies(params)
      : searchApi.discoverTv(params);

    req
      .then((res) => {
        if (!cancelled) {
          setResults(res.data.data);
          setTotal(res.data.meta.total);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [searchParams, mediaType]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`${basePath}?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    const sortBy = searchParams.get('sort_by') ?? 'popularity.desc';
    if (localFilters.genres.length > 0) params.set('genres', localFilters.genres.join(','));
    if (localFilters.yearMin) params.set('year_min', localFilters.yearMin);
    if (localFilters.yearMax) params.set('year_max', localFilters.yearMax);
    if (localFilters.country) params.set('country', localFilters.country);
    if (localFilters.voteMin) params.set('vote_min', localFilters.voteMin);
    params.set('sort_by', sortBy);
    params.set('page', '1');
    router.push(`${basePath}?${params.toString()}`);
    setIsDrawerOpen(false);
  };

  const clearFilters = () => {
    setLocalFilters({ genres: [], yearMin: '', yearMax: '', country: '', voteMin: '' });
    router.push(basePath);
    setIsDrawerOpen(false);
  };

  const sortBy = searchParams.get('sort_by') ?? 'popularity.desc';
  const page = Number(searchParams.get('page') ?? '1');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 lg:hidden"
          aria-label="Mở bộ lọc"
        >
          <Filter className="h-4 w-4" />
          Bộ lọc
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 flex-shrink-0 self-start rounded-lg bg-slate-800/50 p-5 lg:block">
          <FilterSidebar
            genres={genres}
            filters={localFilters}
            onChange={setLocalFilters}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Sort bar */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {total.toLocaleString('vi-VN')} kết quả
            </p>
            <select
              value={sortBy}
              onChange={(e) => updateParams({ sort_by: e.target.value, page: '1' })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Sắp xếp theo"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <SearchResultGrid
            results={results}
            isLoading={isLoading}
            emptyMessage="Không tìm thấy kết quả với bộ lọc hiện tại."
          />

          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[90vw] overflow-y-auto bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Bộ lọc</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                aria-label="Đóng bộ lọc"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar
              genres={genres}
              filters={localFilters}
              onChange={setLocalFilters}
              onApply={applyFilters}
              onClear={clearFilters}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function DiscoverContent({ mediaType }: DiscoverContentProps) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400">Đang tải...</div>}>
      <DiscoverMain mediaType={mediaType} />
    </Suspense>
  );
}
