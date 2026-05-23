'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ScrollableRowProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableRow({ children, className }: ScrollableRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="group/scroll relative">
      {canScrollLeft && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
          className="absolute bottom-2 left-0 top-0 z-10 flex w-10 items-center justify-start pl-1
            bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent
            opacity-0 transition-opacity group-hover/scroll:opacity-100"
          aria-label="Scroll left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full
            border border-slate-700 bg-slate-800/90 text-white
            transition-colors hover:bg-slate-700">
            <ChevronLeft className="h-5 w-5" />
          </span>
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn('flex gap-3 overflow-x-auto pb-2 scrollbar-hide', className)}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
          className="absolute bottom-2 right-0 top-0 z-10 flex w-10 items-center justify-end pr-1
            bg-gradient-to-l from-slate-900 via-slate-900/60 to-transparent
            opacity-0 transition-opacity group-hover/scroll:opacity-100"
          aria-label="Scroll right"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full
            border border-slate-700 bg-slate-800/90 text-white
            transition-colors hover:bg-slate-700">
            <ChevronRight className="h-5 w-5" />
          </span>
        </button>
      )}
    </div>
  );
}
