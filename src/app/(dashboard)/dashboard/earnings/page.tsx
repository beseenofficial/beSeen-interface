'use client';

import {
  ArrowDownToLine,
  Check,
  CircleDollarSign,
  CircleMinus,
  Copy,
  RefreshCw,
  ReceiptText,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardPage } from '@/components/layout/dashboard-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { earningsApi, type EarningTransaction } from '@/lib/api';
import { useWithdrawableEarnings } from '@/lib/use-withdrawable-earnings';

const PAGE_SIZE = 25;
function readableDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function EarningsLoading() {
  return (
    <div className="grid gap-5" role="status" aria-label="Loading earnings">
      <div className="h-48 animate-pulse rounded-2xl bg-white" />
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

function HashCopy({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-secondary transition hover:bg-subtle hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      onClick={async () => {
        await navigator.clipboard.writeText(hash);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_800);
      }}
      type="button"
      aria-label={`Copy transaction hash ${hash}`}
    >
      <span className="font-mono tabular-nums">{shortHash(hash)}</span>
      {copied ? (
        <Check size={14} aria-hidden />
      ) : (
        <Copy size={14} aria-hidden />
      )}
    </button>
  );
}

export default function EarningsPage() {
  const [items, setItems] = useState<EarningTransaction[]>([]);
  const [totalAmount, setTotalAmount] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const paginationController = useRef<AbortController | null>(null);
  const withdrawable = useWithdrawableEarnings({
    onWithdrawConfirmed: () => setReloadKey((current) => current + 1),
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void earningsApi
      .list({ limit: PAGE_SIZE }, controller.signal)
      .then((page) => {
        setItems(page.items);
        setTotalAmount(page.totalAmount);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Earnings could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => () => paginationController.current?.abort(), []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    paginationController.current?.abort();
    const controller = new AbortController();
    paginationController.current = controller;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await earningsApi.list(
        { limit: PAGE_SIZE, before: nextCursor },
        controller.signal,
      );
      setItems((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        page.items.forEach((item) => byId.set(item.id, item));
        return [...byId.values()];
      });
      setTotalAmount(page.totalAmount);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setLoadMoreError(
          cause instanceof Error
            ? cause.message
            : 'More earnings could not be loaded.',
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  return (
    <DashboardPage className="mx-auto max-w-[1320px]">
      <PageHeader
        title="Earnings"
        description="Track confirmed bounty rewards, Aura sales, and withdrawals."
      />

      {loading ? (
        <EarningsLoading />
      ) : error ? (
        <ErrorState
          message="We couldn't load your earnings history. Check your connection and try again."
          retry={() => setReloadKey((current) => current + 1)}
        />
      ) : (
        <>
          <section
            className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"
            aria-label="Earnings summary"
          >
            <article className="relative min-h-52 overflow-hidden rounded-2xl bg-navy p-7 text-white max-sm:p-5">
              <span
                className="absolute -right-14 -top-16 size-52 rounded-full bg-brand/45 blur-3xl"
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-between gap-8">
                <span className="flex items-center gap-2 text-sm font-semibold text-white/75">
                  <CircleDollarSign size={19} aria-hidden /> Net tracked balance
                </span>
                <div>
                  <strong className="block break-all text-[clamp(38px,6vw,68px)] font-medium leading-none tracking-[-0.04em] tabular-nums">
                    {totalAmount ?? '—'}
                  </strong>
                  <span className="mt-2 block text-sm font-semibold text-aqua">
                    USDC
                  </span>
                </div>
              </div>
            </article>

            <article className="flex min-h-52 flex-col justify-between gap-6 rounded-2xl border border-border bg-white p-6 max-sm:p-5">
              <div>
                <span className="grid size-11 place-items-center rounded-xl bg-success-bg text-success">
                  <ArrowDownToLine size={21} aria-hidden />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">
                  Withdraw earnings
                </h2>
                <p className="mt-2 max-w-[48ch] text-sm leading-6 text-secondary">
                  Withdraw your current contract earnings to your connected
                  wallet. If needed, the same transaction will create your USDC
                  trustline.
                </p>
                <div className="mt-4 rounded-xl bg-subtle px-4 py-3">
                  <span className="block text-xs font-semibold text-secondary">
                    Available to withdraw
                  </span>
                  {withdrawable.loading ? (
                    <span
                      className="mt-2 block h-6 w-28 animate-pulse rounded-md bg-border"
                      aria-label="Loading withdrawable earnings"
                    />
                  ) : withdrawable.ready ? (
                    <strong className="mt-1 block break-all text-lg font-semibold tabular-nums text-navy">
                      {withdrawable.amount} USDC
                    </strong>
                  ) : (
                    <span className="mt-1 block text-sm font-semibold text-secondary">
                      Unavailable
                    </span>
                  )}
                  {withdrawable.ready && withdrawable.hasUsdcTrustline === false && (
                    <span className="mt-1 block text-xs leading-5 text-secondary">
                      Your USDC trustline will be created as part of this
                      transaction.
                    </span>
                  )}
                </div>
                {withdrawable.withdrawError && (
                  <p className="mt-3 text-sm leading-5 text-error" role="alert">
                    {withdrawable.withdrawError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {withdrawable.error && (
                  <Button
                    variant="secondary"
                    icon={<RefreshCw size={17} />}
                    onClick={() => {
                      void withdrawable.retry();
                    }}
                  >
                    Retry balance
                  </Button>
                )}
                <Button
                  className="w-full sm:w-fit"
                  icon={<ArrowDownToLine size={18} />}
                  loading={withdrawable.withdrawing}
                  disabled={!withdrawable.canWithdraw}
                  onClick={() => void withdrawable.withdraw()}
                >
                  Withdraw
                </Button>
              </div>
            </article>
          </section>

          <section
            className="mt-5 overflow-hidden rounded-2xl border border-border bg-white"
            aria-labelledby="earnings-history-title"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5 max-sm:px-4">
              <div>
                <h2
                  className="text-lg font-semibold"
                  id="earnings-history-title"
                >
                  Transaction history
                </h2>
                <p className="mt-1 text-xs text-secondary">
                  Confirmed on-chain earnings and withdrawals, newest first.
                </p>
              </div>
              <ReceiptText
                className="shrink-0 text-brand"
                size={22}
                aria-hidden
              />
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No earnings yet"
                message="Confirmed bounty rewards, Aura sales, and withdrawals will appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const outgoing = item.type === 'withdrawal';
                  const KindIcon = outgoing ? CircleMinus : item.type === 'aura_purchase' ? Sparkles : CircleDollarSign;
                  return (
                    <li
                      className="grid gap-4 px-6 py-5 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center max-sm:px-4"
                      key={item.id}
                    >
                      <span className={`grid size-10 place-items-center rounded-xl ${outgoing ? 'bg-error-bg text-error' : item.type === 'aura_purchase' ? 'bg-[#f0edff] text-[#6555bd]' : 'bg-success-bg text-success'}`} aria-hidden>
                        <KindIcon size={19} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <strong className={`text-[17px] font-semibold tabular-nums ${outgoing ? 'text-error' : 'text-success'}`}>
                            {outgoing ? '' : '+'}{item.amount} {item.assetCode}
                          </strong>
                          <span className="text-sm font-semibold text-navy">{item.reason}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                          <time dateTime={item.earnedAt} title={item.earnedAt}>{readableDate(item.earnedAt)}</time>
                          {item.type === 'bounty_reply' && item.contractBountyId !== null && (
                            <span>Contract bounty #{item.contractBountyId}</span>
                          )}
                          {item.type === 'aura_purchase' && item.contractAuraTokenId !== null && (
                            <span>Aura token #{item.contractAuraTokenId}</span>
                          )}
                        </div>
                      </div>
                      <HashCopy hash={item.transactionHash} />
                    </li>
                  );
                })}
              </ul>
            )}

            {(hasMore || loadMoreError) && (
              <div className="border-t border-border px-6 py-4 text-center max-sm:px-4">
                {loadMoreError && (
                  <p className="mb-3 text-sm text-error" role="alert">
                    Couldn&apos;t load more earnings. Try again.
                  </p>
                )}
                <Button
                  variant="secondary"
                  loading={loadingMore}
                  onClick={() => void loadMore()}
                >
                  Load more
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </DashboardPage>
  );
}
