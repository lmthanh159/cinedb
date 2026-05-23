'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

export function BiographySection({ biography }: { biography: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = biography.length > 400;

  return (
    <div>
      <p className={cn('text-sm leading-relaxed text-slate-300', !expanded && isLong && 'line-clamp-4')}>
        {biography}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          {expanded ? 'Thu gọn ↑' : 'Đọc thêm ↓'}
        </button>
      )}
    </div>
  );
}
