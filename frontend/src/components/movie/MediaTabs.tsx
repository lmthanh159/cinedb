'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

import { TrailerModal } from '@/components/movie/TrailerModal';
import { ScrollableRow } from '@/components/ui/ScrollableRow';
import { cn, getImageUrl } from '@/lib/utils';
import type { MediaImage, Trailer } from '@/types';

export interface MediaTabsProps {
  trailers: Trailer[];
  posters: MediaImage[];
  backdrops: MediaImage[];
}

type Tab = 'videos' | 'backdrops' | 'posters';

export function MediaTabs({ trailers, posters, backdrops }: MediaTabsProps) {
  const youtubeVideos = trailers.filter((t) => t.site === 'YouTube');

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'videos', label: 'Videos', count: youtubeVideos.length },
    { id: 'backdrops', label: 'Backdrops', count: backdrops.length },
    { id: 'posters', label: 'Posters', count: posters.length },
  ];
  const tabs = allTabs.filter((t) => t.count > 0);

  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]?.id ?? 'videos');
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerName, setTrailerName] = useState<string | undefined>(undefined);

  if (tabs.length === 0) return null;

  const openTrailer = (key: string, name?: string) => {
    setTrailerKey(key);
    setTrailerName(name);
  };

  return (
    <section aria-label="Media">
      {/* Tab bar */}
      <div className="mb-4 flex gap-6 border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              '-mb-px pb-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-300',
            )}
          >
            {tab.label}{' '}
            <span className="text-xs opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Videos */}
      {activeTab === 'videos' && (
        <ScrollableRow>
          {youtubeVideos.slice(0, 10).map((video) => (
            <div key={video.id} className="flex-shrink-0 w-[260px]">
              <button
                onClick={() => openTrailer(video.key, video.name)}
                className="group relative h-[146px] w-[260px] cursor-pointer overflow-hidden rounded-lg bg-slate-800"
                aria-label={`Phát ${video.name}`}
              >
                <Image
                  src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                  alt={video.name}
                  fill
                  sizes="260px"
                  className="object-cover opacity-70 transition-opacity duration-200 group-hover:opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/90 transition-transform duration-200 group-hover:scale-110">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
                  <p className="line-clamp-1 text-left text-xs text-white">{video.name}</p>
                </div>
              </button>
              <p className="mt-1 truncate text-xs text-slate-400">{video.name}</p>
            </div>
          ))}
        </ScrollableRow>
      )}

      {/* Backdrops */}
      {activeTab === 'backdrops' && (
        <ScrollableRow>
          {backdrops.slice(0, 15).map((img) => (
            <div
              key={img.id}
              className="relative aspect-video w-[280px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-800"
            >
              <Image
                src={getImageUrl(img.filePath, 'w780')}
                alt="Backdrop"
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          ))}
        </ScrollableRow>
      )}

      {/* Posters */}
      {activeTab === 'posters' && (
        <ScrollableRow>
          {posters.slice(0, 20).map((img) => (
            <div
              key={img.id}
              className="relative h-[210px] w-[140px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-800"
            >
              <Image
                src={getImageUrl(img.filePath, 'w342')}
                alt="Poster"
                fill
                sizes="140px"
                className="object-cover"
              />
            </div>
          ))}
        </ScrollableRow>
      )}

      {trailerKey && (
        <TrailerModal
          isOpen={!!trailerKey}
          onClose={() => setTrailerKey(null)}
          trailerKey={trailerKey}
          trailerName={trailerName}
        />
      )}
    </section>
  );
}
