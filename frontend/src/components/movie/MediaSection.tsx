'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

import { cn, getImageUrl } from '@/lib/utils';
import type { MediaImage, Trailer } from '@/types';

export interface MediaSectionProps {
  trailers: Trailer[];
  posters: MediaImage[];
  backdrops: MediaImage[];
  onTrailerPlay: (key: string) => void;
}

type Tab = 'trailers' | 'posters' | 'backdrops';

export function MediaSection({ trailers, posters, backdrops, onTrailerPlay }: MediaSectionProps) {
  const youtubeTrailers = trailers.filter((t) => t.site === 'YouTube');

  const tabs: { id: Tab; label: string; count: number }[] = (
    [
      { id: 'trailers' as Tab, label: 'Trailer', count: youtubeTrailers.length },
      { id: 'posters' as Tab, label: 'Poster', count: posters.length },
      { id: 'backdrops' as Tab, label: 'Hình nền', count: backdrops.length },
    ] as const
  ).filter((t) => t.count > 0);

  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]?.id ?? 'trailers');

  if (tabs.length === 0) return null;

  return (
    <section aria-label="Media">
      <div className="mb-4 flex flex-wrap items-center gap-1">
        <h2 className="mr-3 text-xl font-bold text-white">Media</h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {activeTab === 'trailers' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {youtubeTrailers.slice(0, 6).map((trailer) => (
            <button
              key={trailer.id}
              onClick={() => onTrailerPlay(trailer.key)}
              className="group relative aspect-video w-full overflow-hidden rounded-lg bg-slate-800"
              aria-label={`Phát ${trailer.name}`}
            >
              <Image
                src={`https://img.youtube.com/vi/${trailer.key}/mqdefault.jpg`}
                alt={trailer.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/90">
                  <Play className="h-6 w-6 fill-white text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                <p className="line-clamp-1 text-left text-sm font-medium text-white">
                  {trailer.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'posters' && (
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {posters.slice(0, 20).map((poster) => (
            <div
              key={poster.id}
              className="relative h-[225px] w-[150px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-800"
            >
              <Image
                src={getImageUrl(poster.filePath, 'w342')}
                alt="Movie poster"
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'backdrops' && (
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {backdrops.slice(0, 12).map((backdrop) => (
            <div
              key={backdrop.id}
              className="relative aspect-video w-[320px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-800"
            >
              <Image
                src={getImageUrl(backdrop.filePath, 'w780')}
                alt="Movie backdrop"
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
