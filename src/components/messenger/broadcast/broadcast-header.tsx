'use client';

import { BadgeCheck, ChevronLeft, Radio } from 'lucide-react';

export function BroadcastHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5">
      <button
        className="mr-1 hidden size-10 cursor-pointer place-items-center rounded-xl border border-border bg-white max-[720px]:grid"
        onClick={onBack}
        aria-label="Back to conversations"
        type="button"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white">
        <Radio size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-1.5 text-lg font-semibold">
          Broadcast <BadgeCheck className="fill-brand text-white" size={17} aria-label="Official" />
        </h1>
        <p className="mt-1 text-[11px] text-success">Official BeSeen channel</p>
      </div>
    </header>
  );
}
