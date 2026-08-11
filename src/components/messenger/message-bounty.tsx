'use client';

import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessengerBounty } from '@/types';

function BountyBadge({ bounty }: { bounty: MessengerBounty }) {
  const tones = {
    offered: 'border-lime/70 bg-lime/35 text-navy',
    claimable: 'border-success/30 bg-success-bg text-success',
    claimed: 'border-success/30 bg-success-bg text-success',
    expired: 'border-border bg-subtle text-muted',
  };
  const labels = {
    offered: 'Offered',
    claimable: 'Claimable',
    claimed: 'Claimed',
    expired: 'Expired',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', tones[bounty.status])}>
      <Gift size={12} aria-hidden="true" /> {labels[bounty.status]}
    </span>
  );
}

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
  return (
    <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-border bg-white text-navy">
      <div className="flex min-w-0 items-center gap-2.5 bg-lime/45 px-3.5 py-3">
        <Gift className="shrink-0" size={17} />
        <strong className="min-w-0 flex-1 text-xs">Demo bounty · {bounty.amount} {bounty.assetCode}</strong>
        <BountyBadge bounty={bounty} />
      </div>
      <div className="px-3.5 py-2.5">
        <p className="text-[11px] leading-4 text-secondary">This is demo metadata only.</p>
        <p className="mt-1 text-[10px] text-muted">No real payment or escrow will be made.</p>
      </div>
      {beneficiary && bounty.status === 'claimable' && (
        <button
          className="mx-3.5 mb-3.5 flex min-h-10 w-[calc(100%-1.75rem)] cursor-pointer items-center justify-center rounded-xl bg-success px-3 text-xs font-semibold text-white transition hover:bg-[#10704f] disabled:opacity-50"
          disabled={claiming}
          onClick={() => onClaim(bounty)}
          type="button"
        >
          {claiming ? 'Claiming…' : 'Claim demo bounty'}
        </button>
      )}
    </div>
  );
}
