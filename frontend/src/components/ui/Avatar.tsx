import Image from 'next/image';

import { cn } from '@/lib/utils';

const sizes = {
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-16 w-16', text: 'text-xl' },
} as const;

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const { container, text } = sizes[size];

  return (
    <div
      className={cn(
        'relative flex-shrink-0 overflow-hidden rounded-full bg-slate-700',
        container,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? name ?? 'User avatar'}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center font-semibold text-slate-300',
            text,
          )}
          aria-label={alt ?? name}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
