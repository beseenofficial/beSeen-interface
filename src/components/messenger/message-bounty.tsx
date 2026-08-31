'use client';

import { Check, Clock3, RotateCcw } from 'lucide-react';
import { UsdcLogo } from '@/components/messenger/usdc-logo';
import type { MessengerBounty } from '@/types';
import { cn } from '@/lib/utils';

export function durationLabel(seconds: number) {
  const [value, unit] = seconds % 86400 === 0
    ? [seconds / 86400, 'day']
    : seconds % 3600 === 0
      ? [seconds / 3600, 'hour']
      : [Math.max(1, Math.ceil(seconds / 60)), 'minute'];
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

function deadlineLabel(expiresAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(expiresAt));
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
  const claimable = beneficiary && bounty.status === 'claimable';
  const claimed = bounty.status === 'claimed';
  const refunded = bounty.status === 'expired';

  return (
    <div
      className={cn(
        'grid min-h-[60px] grid-cols-[minmax(0,1fr)_1px_minmax(104px,.68fr)] items-center gap-3 rounded-b-[18px] px-3.5 py-2.5 text-navy max-sm:min-h-[58px] max-sm:grid-cols-[minmax(0,1fr)_1px_minmax(92px,.68fr)] max-sm:gap-2.5 max-sm:px-3 max-sm:py-2',
        claimed && 'bg-[#F1FBF6]',
        refunded && 'bg-[#FFF8EF]',
        !claimed && !refunded && 'bg-[#FFFCF5]',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full',
            claimed && 'bg-[#D5F3E5] text-[#13845C]',
            refunded && 'bg-[#FFE9D4] text-[#C56A2E]',
            !claimed && !refunded && 'bg-[#FFF0A8] text-[#8A6500]',
          )}
        >
          {claimed ? (
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
          ) : refunded ? (
            <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <UsdcLogo className="size-7" />
          )}
        </span>
        <span className="min-w-0">
          <strong className={cn('block truncate text-[12px] font-semibold leading-4', claimed && 'text-[#13845C]', refunded && 'text-[#C56A2E]')}>
              {claimed ? 'Claimed' : refunded ? 'Returned' : 'Reply reward'}
          </strong>
          {!claimed && !refunded && (
            <span className="block truncate text-[11px] leading-4 text-secondary">
              {bounty.amount} demo {bounty.assetCode}
            </span>
          )}
        </span>
      </div>

      <span className="h-8 w-px bg-[#DDE2E3]" aria-hidden="true" />

      <div className="min-w-0">
        {claimable ? (
          <button
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-brand px-2.5 text-xs font-semibold text-white transition hover:bg-[#0C3BD6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
            disabled={claiming}
            onClick={() => onClaim(bounty)}
            type="button"
          >
            {claiming ? 'Claiming…' : 'Claim bounty'}
          </button>
        ) : (
          <>
            <span className="flex items-center gap-1 text-[11px] leading-4 text-secondary">
              {!claimed && !refunded && <Clock3 size={12} aria-hidden="true" />}
              {claimed ? 'Reward claimed' : refunded ? 'Reward returned' : durationLabel(bounty.durationSeconds)}
            </span>
            <strong className="block truncate text-xs font-semibold leading-4">
              {claimed ? 'Thanks sent' : refunded ? 'Back to sender' : `By ${deadlineLabel(bounty.expiresAt)}`}
            </strong>
          </>
        )}
      </div>
    </div>
  );
}
