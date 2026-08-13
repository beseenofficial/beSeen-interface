'use client';

import { BadgeCheck, Radio } from 'lucide-react';
import { MessengerHeader } from '@/components/messenger/messenger-header';

export function BroadcastHeader({ onBack }: { onBack: () => void }) {
  return (
    <MessengerHeader onBack={onBack}>
      <div className="flex min-w-0 flex-1 items-center gap-3 max-[720px]:min-h-12 max-[720px]:gap-2.5 max-[720px]:rounded-2xl max-[720px]:border-0 max-[720px]:bg-transparent max-[720px]:px-2.5 max-[720px]:shadow-none">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white">
          <Radio size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="flex items-center gap-1.5 truncate text-base font-semibold">
            Broadcast
            <BadgeCheck
              className="shrink-0 fill-brand text-white"
              size={17}
              aria-label="Official"
            />
          </strong>
        </span>
      </div>
    </MessengerHeader>
  );
}
