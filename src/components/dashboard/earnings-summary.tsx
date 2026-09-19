'use client';

import { ArrowDownToLine, ArrowUpRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { EarningTransaction } from '@/lib/api';
import { formatUsdc } from '@/lib/decimal';
import { useWithdrawableEarnings } from '@/lib/use-withdrawable-earnings';

function relativeDate(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const ranges = [['day', 86400], ['hour', 3600], ['minute', 60]] as const;
  for (const [unit, amount] of ranges) {
    if (Math.abs(seconds) >= amount) return formatter.format(Math.round(seconds / amount), unit);
  }
  return 'Just now';
}

export function EarningsSummary({
  totalAmount,
  latest,
  loading,
  onWithdrawConfirmed,
}: {
  totalAmount: string | null;
  latest: EarningTransaction | null;
  loading: boolean;
  onWithdrawConfirmed?: () => void;
}) {
  const withdrawable = useWithdrawableEarnings({ onWithdrawConfirmed });

  return (
    <article className="overview-earnings-card flex min-h-0 flex-col overflow-hidden rounded-2xl bg-navy p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Earnings</h2>
        <Link
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          href="/dashboard/earnings"
        >
          View history <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>

      <div className="overview-earnings-body mt-3 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <span className="block text-xs font-semibold text-white/65">Available to withdraw</span>
          {withdrawable.loading ? (
            <span className="mt-2 block h-9 w-32 animate-pulse rounded-lg bg-white/15" role="status">
              <span className="sr-only">Loading withdrawable earnings</span>
            </span>
          ) : withdrawable.error ? (
            <strong className="mt-1 block text-xl font-semibold">Unavailable</strong>
          ) : (
            <strong
              className="overview-earnings-value mt-1 block truncate text-[clamp(26px,3.2vw,42px)] font-medium leading-none tracking-[-0.04em] tabular-nums"
              title={`${withdrawable.amount ?? '0'} USDC`}
            >
              {withdrawable.amount ?? '0'} <span className="text-[0.42em] tracking-normal text-aqua">USDC</span>
            </strong>
          )}
        </div>

        {withdrawable.error ? (
          <Button
            className="overview-earnings-action px-3"
            variant="invertedSecondary"
            icon={<RefreshCw size={16} />}
            onClick={() => void withdrawable.retry()}
          >
            Retry
          </Button>
        ) : (
          <Button
            className="overview-earnings-action px-4"
            variant="inverted"
            icon={<ArrowDownToLine size={17} />}
            loading={withdrawable.withdrawing}
            disabled={!withdrawable.canWithdraw}
            onClick={() => void withdrawable.withdraw()}
          >
            Withdraw
          </Button>
        )}
      </div>

      <div className="overview-earnings-meta mt-4 flex min-w-0 items-center gap-5 border-t border-white/12 pt-3 text-xs">
        <span className="min-w-0">
          <span className="text-white/55">All-time</span>{' '}
          <strong className="tabular-nums text-white" title={totalAmount ? formatUsdc(totalAmount) : undefined}>
            {loading ? '…' : totalAmount === null ? 'Unavailable' : formatUsdc(totalAmount)}
          </strong>
        </span>
        <span className="min-w-0 truncate text-white/55">
          {latest ? (
            <>
              Latest{' '}
              <strong className={latest.type === 'withdrawal' ? 'text-[#ffb3bd]' : 'text-white'}>
                {latest.type === 'withdrawal' ? '' : '+'}{latest.amount} {latest.assetCode}
              </strong>{' '}
              · {relativeDate(latest.earnedAt)}
            </>
          ) : loading ? 'Checking recent earnings…' : 'No earnings yet'
          }
        </span>
      </div>

      {withdrawable.withdrawError && (
        <p className="mt-2 truncate text-xs text-peach" role="alert" title={withdrawable.withdrawError}>
          {withdrawable.withdrawError}
        </p>
      )}
    </article>
  );
}
