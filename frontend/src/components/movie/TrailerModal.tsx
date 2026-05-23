'use client';

import { Modal } from '@/components/ui';

export interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerKey: string;
  trailerName?: string;
}

export function TrailerModal({ isOpen, onClose, trailerKey, trailerName }: TrailerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={trailerName ?? 'Trailer'} size="xl">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {isOpen && (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
            title={trailerName ?? 'Trailer'}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        )}
      </div>
    </Modal>
  );
}
