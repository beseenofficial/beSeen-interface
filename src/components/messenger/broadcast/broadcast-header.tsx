'use client';

import { ArrowLeft, BadgeCheck, Radio } from 'lucide-react';

export function BroadcastHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5 max-[720px]:gap-2 max-[720px]:bg-subtle max-[720px]:px-3 max-[720px]:py-2">
      <button
        className="hidden size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-border bg-white text-navy shadow-[0_2px_8px_rgba(11,11,63,0.04)] transition hover:border-brand/25 hover:bg-info-bg max-[720px]:grid"
        onClick={onBack}
        aria-label="Back to conversations"
        type="button"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3 max-[720px]:min-h-12 max-[720px]:gap-2.5 max-[720px]:rounded-xl max-[720px]:border max-[720px]:border-border max-[720px]:bg-white max-[720px]:px-2.5 max-[720px]:shadow-[0_2px_8px_rgba(11,11,63,0.04)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white max-[720px]:size-9">
          <Radio size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="flex items-center gap-1.5 truncate text-lg font-semibold max-[720px]:text-base">
            Broadcast
            <BadgeCheck
              className="shrink-0 fill-brand text-white"
              size={17}
              aria-label="Official"
            />
          </strong>
          <span className="mt-1 block text-[11px] leading-none text-success max-[720px]:mt-0.5">
            Official BeSeen channel
          </span>
        </span>
      </div>
    </header>
  );
}
