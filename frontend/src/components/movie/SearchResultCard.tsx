'use client';

import Image from 'next/image';
import Link from 'next/link';

import { RatingCircle } from '@/components/ui/StarRating';
import { ROUTES } from '@/lib/constants';
import { cn, getImageUrl } from '@/lib/utils';
import { MEDIA_TYPE } from '@/types';
import type { SearchResult } from '@/types';

export interface SearchResultCardProps {
  result: SearchResult;
  className?: string;
}

function getHref(result: SearchResult): string {
  if (result.mediaType === MEDIA_TYPE.TV) return ROUTES.TV_SHOW(result.id);
  if (result.mediaType === MEDIA_TYPE.PERSON) return ROUTES.PERSON(result.id);
  return ROUTES.MOVIE(result.id);
}

export function SearchResultCard({ result, className }: SearchResultCardProps) {
  const href = getHref(result);
  const isPerson = result.mediaType === MEDIA_TYPE.PERSON;
  const imagePath = isPerson ? result.profileUrl : result.posterUrl;

  return (
    <Link href={href} className={cn('group relative block', className)}>
      <div
        className={cn(
          'relative aspect-[2/3] overflow-hidden bg-slate-800',
          isPerson ? 'rounded-full' : 'rounded-lg',
        )}
      >
        <Image
          src={getImageUrl(imagePath, 'w342')}
          alt={result.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {!isPerson && result.voteAverage != null && result.voteAverage > 0 && (
          <div className="absolute bottom-2 left-2">
            <RatingCircle value={result.voteAverage} size={40} />
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
          {result.title}
        </p>
        {result.year != null && (
          <p className="text-xs text-slate-400">{result.year}</p>
        )}
      </div>
    </Link>
  );
}
