'use client';

import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function MessengerHeader({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <header className="relative z-20 flex min-w-0 items-center gap-3 border-b border-border bg-white px-5 max-[720px]:gap-2 max-[720px]:border-b-0 max-[720px]:px-3 max-[720px]:py-2">
      <button
        className="hidden size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-border/70 bg-[#F1F4F5] text-navy transition hover:bg-[#E8EDEF] max-[720px]:grid"
        onClick={onBack}
        aria-label="Back to conversations"
        type="button"
      >
        <ArrowLeft size={20} />
      </button>
      {children}
    </header>
  );
}
