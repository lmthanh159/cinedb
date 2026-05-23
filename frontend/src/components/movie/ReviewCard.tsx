import { Avatar } from '@/components/ui/Avatar';
import { formatDate, getRatingColor } from '@/lib/utils';
import type { Review } from '@/types';

export interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <article className="rounded-xl bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={review.user.avatarUrl} name={review.user.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{review.user.displayName}</span>
            <span className={`text-sm font-semibold tabular-nums ${getRatingColor(review.rating)}`}>
              {review.rating}/10
            </span>
            <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
          </div>
          {review.comment && (
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.comment}</p>
          )}
        </div>
      </div>
    </article>
  );
}
