import Image from 'next/image';
import Link from 'next/link';

import { ScrollableRow } from '@/components/ui/ScrollableRow';
import { ROUTES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import type { CastMember } from '@/types';

export interface CastCarouselProps {
  cast: CastMember[];
  mediaId: number;
  mediaType: 'movie' | 'tv';
}

export function CastCarousel({ cast, mediaId, mediaType }: CastCarouselProps) {
  const visible = cast.slice(0, 20);

  if (visible.length === 0) return null;

  const castHref = mediaType === 'tv' ? `/tv/${mediaId}/cast` : `/movie/${mediaId}/cast`;

  return (
    <section aria-label="Diễn viên chính">
      <h2 className="mb-3 text-lg font-medium text-white">Top billed cast</h2>

      <ScrollableRow>
        {visible.map((member) => (
          <Link
            key={member.person.id}
            href={ROUTES.PERSON(member.person.id)}
            className="group w-[130px] flex-shrink-0"
          >
            <div className="relative h-[140px] w-[130px] overflow-hidden rounded-t-lg bg-slate-800">
              <Image
                src={getImageUrl(member.person.profileUrl, 'w185')}
                alt={member.person.name}
                fill
                sizes="120px"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="rounded-b-lg bg-slate-800 p-2">
              <p className="line-clamp-1 text-xs font-medium text-slate-100 transition-colors group-hover:text-blue-400">
                {member.person.name}
              </p>
              <p className="line-clamp-1 text-xs text-slate-500">{member.character}</p>
            </div>
          </Link>
        ))}
      </ScrollableRow>

      <Link
        href={castHref}
        className="mt-2 inline-block text-sm text-blue-400 transition-colors hover:text-blue-300"
      >
        Full cast &amp; crew →
      </Link>
    </section>
  );
}
