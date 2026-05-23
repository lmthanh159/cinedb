'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { GridSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui';
import { peopleApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import type { Person } from '@/types';

const PAGE_SIZE = 20;

function PersonCard({ person }: { person: Person }) {
  return (
    <Link href={ROUTES.PERSON(person.id)} className="group relative block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-black/60">
        <Image
          src={getImageUrl(person.profileUrl, 'w342')}
          alt={person.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <div className="mt-2 space-y-0.5 text-center">
        <p className="line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
          {person.name}
        </p>
        {person.knownForDepartment && (
          <p className="text-xs text-slate-500">{person.knownForDepartment}</p>
        )}
      </div>
    </Link>
  );
}

function PeopleMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');

  const [people, setPeople] = useState<Person[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    peopleApi
      .getPeople({ page, limit: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          setPeople(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/people?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Diễn viên & Đội ngũ</h1>
        <GridSkeleton count={PAGE_SIZE} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Diễn viên & Đội ngũ</h1>

      {people.length === 0 ? (
        <p className="py-12 text-center text-slate-400">Không tìm thấy kết quả.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400">Đang tải...</div>}>
      <PeopleMain />
    </Suspense>
  );
}
