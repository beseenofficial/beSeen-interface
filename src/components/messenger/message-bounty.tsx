'use client';

import { Check, Clock3, LoaderCircle, RotateCcw } from 'lucide-react';
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

function settlementLabel(bounty: MessengerBounty): { small: string; strong: string } | null {
  // Settlement is executed by the server verifier (settle_replies); the
  // client only renders its asynchronous progress.
  switch (bounty.settlementStatus) {
    case 'pending':
      return { small: 'Reply received', strong: 'Settlement pending' };
    case 'processing':
      return { small: 'Reply received', strong: 'Settlement processing' };
    case 'confirmed':
      return { small: 'Settlement confirmed', strong: 'Thanks sent' };
    case 'failed':
      return { small: 'On-chain settlement', strong: 'Settlement failed' };
    default:
      return null;
  }
}

export function MessageBounty({
  bounty,
  canClaimExpired = false,
  reclaiming = false,
  reclaimError = null,
  onClaimExpired,
}: {
  bounty: MessengerBounty;
  canClaimExpired?: boolean;
  reclaiming?: boolean;
  reclaimError?: string | null;
  onClaimExpired?: () => void;
}) {
  const claimed = bounty.status === 'claimed';
  const expired = bounty.status === 'expired';
  const refunded = expired && bounty.fundingStatus === 'contract_refunded';
  const reclaimable =
    expired &&
    canClaimExpired &&
    !refunded &&
    bounty.fundingStatus !== 'contract_settled' &&
    Boolean(onClaimExpired);
  const settlement =
    bounty.status === 'claimable' || claimed ? settlementLabel(bounty) : null;

  return (
    <div
      className={cn(
        'grid min-h-[60px] grid-cols-[minmax(0,1fr)_1px_minmax(104px,.68fr)] items-center gap-3 rounded-b-[18px] px-3.5 py-2.5 text-navy max-sm:min-h-[58px] max-sm:grid-cols-[minmax(0,1fr)_1px_minmax(92px,.68fr)] max-sm:gap-2.5 max-sm:px-3 max-sm:py-2',
        claimed && 'bg-[#F1FBF6]',
        expired && !claimed && 'bg-[#FFF8EF]',
        !claimed && !expired && 'bg-[#FFFCF5]',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full',
            claimed && 'bg-[#D5F3E5] text-[#13845C]',
            expired && !claimed && 'bg-[#FFE9D4] text-[#C56A2E]',
            !claimed && !expired && 'bg-[#FFF0A8] text-[#8A6500]',
          )}
        >
          {claimed ? (
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
          ) : expired ? (
            <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <UsdcLogo className="size-7" />
          )}
        </span>
        <span className="min-w-0">
          <strong className={cn('block truncate text-[12px] font-semibold leading-4', claimed && 'text-[#13845C]', expired && !claimed && 'text-[#C56A2E]')}>
              {claimed ? 'Claimed' : refunded ? 'Refunded on-chain' : expired ? 'Bounty expired' : 'Reply reward'}
          </strong>
          {!claimed && !refunded && (
            <span className="block truncate text-[11px] leading-4 text-secondary">
              {bounty.amount} {bounty.assetCode}
            </span>
          )}
        </span>
      </div>

      <span className="h-8 w-px bg-[#DDE2E3]" aria-hidden="true" />

      <div className="min-w-0">
        {reclaimable ? (
          <div className="min-w-0">
            {reclaimError && (
              <span
                className="mb-0.5 block truncate text-[10px] font-medium leading-3 text-error"
                role="alert"
                title={reclaimError}
              >
                Reclaim failed
              </span>
            )}
            <button
              className="inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#C56A2E] px-2.5 text-[11px] font-semibold text-white shadow-[0_5px_14px_rgba(197,106,46,0.2)] transition hover:bg-[#A95322] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C56A2E] disabled:cursor-wait disabled:opacity-70"
              disabled={reclaiming}
              onClick={onClaimExpired}
              type="button"
              aria-label={`Reclaim expired bounty of ${bounty.amount} ${bounty.assetCode}`}
            >
              {reclaiming ? (
                <LoaderCircle className="animate-spin" size={13} aria-hidden="true" />
              ) : (
                <RotateCcw size={12} strokeWidth={2.3} aria-hidden="true" />
              )}
              {reclaiming ? 'Reclaiming…' : reclaimError ? 'Try again' : 'Reclaim funds'}
            </button>
          </div>
        ) : settlement ? (
          <>
            <span className="flex items-center gap-1 text-[11px] leading-4 text-secondary">
              {settlement.small}
            </span>
            <strong
              className="block truncate text-xs font-semibold leading-4"
              title={bounty.settlementTransactionHash ?? undefined}
            >
              {settlement.strong}
            </strong>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 text-[11px] leading-4 text-secondary">
              {!claimed && !expired && <Clock3 size={12} aria-hidden="true" />}
              {claimed ? 'Reward settled' : expired ? 'Reply window ended' : durationLabel(bounty.durationSeconds)}
            </span>
            <strong className="block truncate text-xs font-semibold leading-4">
              {claimed
                ? 'Thanks sent'
                : expired
                  ? refunded
                    ? 'Back to sender'
                    : 'Refund available on-chain'
                  : `By ${deadlineLabel(bounty.expiresAt)}`}
            </strong>
          </>
        )}
      </div>
    </div>
  );
}
