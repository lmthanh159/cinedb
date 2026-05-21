import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import type { CastMember } from '@/types';

export interface CastSectionProps {
  cast: CastMember[];
}

export function CastSection({ cast }: CastSectionProps) {
  const visible = cast.slice(0, 20);

  return (
    <section aria-label="Diễn viên">
      <h2 className="mb-4 text-xl font-bold text-white">Diễn viên</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((member) => (
          <Link
            key={member.person.id}
            href={ROUTES.PERSON(member.person.id)}
            className="group flex w-[100px] flex-shrink-0 flex-col items-center gap-2 text-center"
          >
            <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full bg-slate-800">
              <Image
                src={getImageUrl(member.person.profileUrl, 'w185')}
                alt={member.person.name}
                fill
                sizes="100px"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="w-full">
              <p className="line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
                {member.person.name}
              </p>
              <p className="line-clamp-1 text-xs text-slate-400">{member.character}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
