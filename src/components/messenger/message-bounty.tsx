'use client';

import { Gift, Sparkles } from 'lucide-react';
import type { MessengerBounty } from '@/types';

const statusLabels: Record<MessengerBounty['status'], string> = {
  offered: 'Bounty added',
  claimable: 'Ready to claim',
  claimed: 'Claimed',
  expired: 'Expired',
};

const bountyDeadline = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function MessageBounty({
  bounty,
  beneficiary,
  claiming,
  onClaim,
}: {
  bounty: MessengerBounty;
  beneficiary: boolean;
  claiming: boolean;
  onClaim: (bounty: MessengerBounty) => void;
}) {
  const claimable = beneficiary && bounty.status === 'claimable';

  return (
    <div className="mt-3 flex min-h-10 max-w-full items-center gap-2.5 rounded-[11px] bg-[#EEF655] px-2.5 py-1.5 text-navy shadow-[inset_0_0_0_1px_rgba(168,104,0,0.10)]">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/65">
        <Gift size={13} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[11px] font-semibold leading-4">{statusLabels[bounty.status]}</strong>
        <time className="block truncate text-[9px] leading-3 text-navy/60" dateTime={bounty.expiresAt}>
          Deadline {bountyDeadline.format(new Date(bounty.expiresAt))}
        </time>
      </span>
      {claimable ? (
        <button
          className="inline-flex min-h-6 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-navy px-2.5 text-[10px] font-semibold text-white transition hover:bg-brand disabled:opacity-50"
          disabled={claiming}
          onClick={() => onClaim(bounty)}
          type="button"
        >
          <Sparkles size={11} aria-hidden="true" />
          {claiming ? 'Claiming…' : 'Claim'}
        </button>
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-navy/45" aria-hidden="true" />
      )}
    </div>
  );
}
