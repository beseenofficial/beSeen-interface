'use client';

import {
  CheckCircle2,
  Clock3,
  Lightbulb,
  LockKeyhole,
  MoreHorizontal,
  Radio,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BroadcastStats,
  type StatCard,
} from '@/components/broadcasts/broadcast-stats';
import { BroadcastPreview } from '@/components/broadcasts/broadcast-preview';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { tokenApi } from '@/lib/api';
import { BROADCAST_REFRESH_INTERVAL_MS, loadCompleteBroadcastFeed, mergeBroadcastFeeds } from '@/lib/broadcast-feed';
import { decryptFeedItem, MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';
import {
  publishEncryptedBroadcast,
  resumeOrCancelDrafts,
} from '@/lib/broadcast-workflow';
import { useAuth } from '@/lib/blux';
import { utf8 } from '@/lib/encoding';
import { useToast } from '@/providers/toast-provider';
import type { DecryptedBroadcast } from '@/types';

const timestamp = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function BroadcastsPage() {
  const { user, keys } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'all' | 'sent'>('all');
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [feeds, setFeeds] = useState<
    Record<'received' | 'sent', DecryptedBroadcast[] | null>
  >({ received: null, sent: null });
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const draftBytes = useMemo(() => utf8(draft).length, [draft]);

  const sentFeed = feeds.sent;
  const allFeed = useMemo(
    () => feeds.received && feeds.sent
      ? mergeBroadcastFeeds(feeds.received, feeds.sent)
      : null,
    [feeds.received, feeds.sent],
  );
  const totalRecipients = sentFeed?.reduce(
    (total, item) => total + item.manifest.audienceCount,
    0,
  );
  const latestSent = sentFeed?.reduce<DecryptedBroadcast | null>(
    (latest, item) =>
      !latest || new Date(item.publishedAt) > new Date(latest.publishedAt)
        ? item
        : latest,
    null,
  );
  const stats: StatCard[] = [
    {
      icon: Radio,
      label: 'Total broadcasts',
      value: sentFeed ? sentFeed.length.toLocaleString() : '—',
      detail: '',
      note: sentFeed ? 'Published broadcasts' : 'Loading',
      tone: 'bg-lilac/55 text-[#5144bb]',
    },
    {
      icon: UsersRound,
      label: 'Followers reached',
      value: totalRecipients?.toLocaleString() ?? '—',
      detail: '',
      note: sentFeed ? 'Total encrypted deliveries' : 'Loading',
      tone: 'bg-aqua/70 text-[#087886]',
    },
    {
      icon: Clock3,
      label: 'Last sent',
      value: latestSent
        ? timestamp.format(new Date(latestSent.publishedAt))
        : sentFeed
          ? 'Never'
          : '—',
      detail: '',
      note: latestSent
        ? `${latestSent.manifest.audienceCount.toLocaleString()} recipients`
        : sentFeed
          ? 'No broadcasts published'
          : 'Loading',
      tone: 'bg-peach/65 text-[#9b3e2b]',
    },
  ];

  const load = useCallback(async ({ resumeDrafts = false, silent = false } = {}) => {
    if (!user || !keys || refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!silent) setError(null);
    try {
      if (resumeDrafts) await resumeOrCancelDrafts(user, keys);
      const [received, sent] = await Promise.all([
        loadCompleteBroadcastFeed('received'),
        loadCompleteBroadcastFeed('sent'),
      ]);
      const [decryptedReceived, decryptedSent] = await Promise.all([
        Promise.all(received.map((item) => decryptFeedItem(item, keys))),
        Promise.all(sent.map((item) => decryptFeedItem(item, keys))),
      ]);
      setFeeds({ received: decryptedReceived, sent: decryptedSent });
    } catch (cause) {
      if (!silent) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Your encrypted broadcasts could not be loaded.',
        );
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [keys, user]);

  useEffect(() => {
    void load({ resumeDrafts: true });
    const refresh = () => void load({ silent: true });
    const interval = window.setInterval(refresh, BROADCAST_REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    tokenApi.followerCount(user.username, controller.signal).then(setFollowerCount).catch(() => undefined);
    return () => controller.abort();
  }, [user]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !user || !keys || draftBytes > MAX_BROADCAST_BYTES) return;
    setSending(true);
    setError(null);
    try {
      const published = await publishEncryptedBroadcast(content, user, keys);
      setDraft('');
      toast(
        'Broadcast published',
        `Encrypted for the ${published.audience.count} follower${published.audience.count === 1 ? '' : 's'} in this immutable audience.`,
      );
      setView('sent');
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your broadcast could not be published.',
      );
    } finally {
      setSending(false);
    }
  }

  if (!user || !keys) {
    return <LoadingState label="Preparing your encrypted broadcasts…" />;
  }
  const feed = view === 'all' ? allFeed : feeds.sent;

  return (
    <div className="mx-auto min-w-0 w-full max-w-[1220px] overflow-x-hidden px-6 pb-12 pt-8 2xl:max-w-[1380px] 2xl:px-10 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      <PageHeader
        eyebrow="End-to-end encrypted"
        title="Broadcasts"
        description="Messages are encrypted in your browser for you and each follower. BeSeen only stores ciphertext."
      />

      <BroadcastStats stats={stats} />

      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
        <div className="grid min-w-0 gap-5">
          <form
            className="min-w-0 rounded-2xl border border-border bg-white p-6 max-sm:p-4"
            onSubmit={publish}
          >
            <h2 className="text-xl font-semibold">New broadcast</h2>
            <div className="relative mt-4">
              <textarea
                className="min-h-32 w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm leading-6 text-navy outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Share an update with your followers…"
              />
              <span
                className={
                  draftBytes > MAX_BROADCAST_BYTES
                    ? 'absolute bottom-3 right-3 text-[11px] text-error'
                    : 'absolute bottom-3 right-3 text-[11px] text-muted'
                }
              >
                {draftBytes.toLocaleString()} /{' '}
                {MAX_BROADCAST_BYTES.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-muted">
              <LockKeyhole size={13} /> Encrypted before it leaves this device
            </p>

            <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-2.5 max-sm:items-stretch max-sm:[&_button]:min-w-0 max-sm:[&_button]:flex-1">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold hover:bg-subtle"
                type="button"
              >
                <UsersRound size={17} />
                <span className="text-left">
                  <b className="block text-[10px]">Audience</b>
                  <span className="text-[10px] text-secondary">
                    All followers
                  </span>
                </span>
              </button>

              <Button
                type="submit"
                loading={sending}
                disabled={!draft.trim() || draftBytes > MAX_BROADCAST_BYTES}
                icon={<LockKeyhole size={17} />}
              >
                Publish encrypted
              </Button>
            </div>
          </form>

          {error && <ErrorState message={error} retry={() => void load()} />}

          <section className="min-w-0 rounded-2xl border border-border bg-white p-5.5 max-sm:p-4">
            <h2 className="text-lg font-semibold">Recent broadcasts</h2>
            <div className="mt-2 flex gap-5 border-b border-border">
              {(
                [
                  ['all', 'All'],
                  ['sent', 'Sent'],
                ] as const
              ).map(([key, label]) => (
                <button
                  className={
                    view === key
                      ? 'border-b-2 border-brand px-2 py-2 text-xs font-semibold text-brand'
                      : 'border-b-2 border-transparent px-2 py-2 text-xs font-semibold text-secondary hover:text-navy'
                  }
                  key={key}
                  onClick={() => setView(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {!feed ? (
              <LoadingState label="Verifying encrypted broadcasts…" />
            ) : feed.length === 0 ? (
              <EmptyState
                title={`No ${view} broadcasts yet`}
                message="Encrypted broadcasts will appear here after publication."
              />
            ) : (
              <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[minmax(260px,1.7fr)_90px_90px_110px_28px] gap-3 border-b border-border px-2 pb-2 text-[10px] text-muted">
                    <span>Broadcast</span>
                    <span>Status</span>
                    <span>Delivered</span>
                    <span>Date</span>
                    <span />
                  </div>
                  <ul className="divide-y divide-border">
                    {feed.map((item) => (
                      <li
                        className="grid grid-cols-[minmax(260px,1.7fr)_90px_90px_110px_28px] items-center gap-3 px-2 py-3"
                        key={item.id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            username={item.creator.username}
                            src={item.creator.avatar}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <strong className="block truncate text-xs">
                              @{item.creator.username}
                            </strong>
                            {item.state === 'decrypted' ? (
                              <BroadcastPreview
                                className="text-[11px] text-secondary"
                                content={item.content || 'Broadcast'}
                                username={item.creator.username}
                                avatar={item.creator.avatar}
                                publishedAt={item.publishedAt}
                                isOwn={item.viewerKey.source === 'creator'}
                                recipientCount={item.manifest.audienceCount}
                              />
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-warning">
                                <ShieldAlert size={12} /> Encrypted content
                              </span>
                            )}
                          </span>
                        </div>
                        <StatusBadge
                          tone={
                            item.state === 'decrypted' ? 'success' : 'warning'
                          }
                        >
                          {item.state === 'decrypted' ? 'Encrypted' : 'Locked'}
                        </StatusBadge>
                        <span className="text-xs font-semibold">—</span>
                        <time
                          className="text-[10px] text-muted"
                          dateTime={item.publishedAt}
                        >
                          {timestamp.format(new Date(item.publishedAt))}
                        </time>
                        <button
                          className="grid size-7 place-items-center rounded-lg hover:bg-subtle"
                          type="button"
                          aria-label="Broadcast actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="grid min-w-0 gap-5">
          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Encryption status</h2>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-bg px-2.5 py-1.5 text-[10px] font-semibold text-success">
                <ShieldCheck size={14} /> Secure &amp; private
              </span>
            </div>
            <ul className="mt-4 grid gap-3 text-xs text-secondary">
              <li className="flex gap-2">
                <CheckCircle2 className="shrink-0 text-emerald-500" size={15} />
                Messages are encrypted in your browser.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="shrink-0 text-emerald-500" size={15} />
                Only each follower can decrypt.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="shrink-0 text-emerald-500" size={15} />
                BeSeen only stores ciphertext.
              </li>
            </ul>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-5">
            <Image
              className="absolute inset-0 size-full object-cover object-right opacity-70"
              src="/brand/dashboard-orbit-light.png"
              width={1536}
              height={1024}
              alt=""
            />
            <div className="relative z-10">
              <h2 className="text-base font-semibold">Audience preview</h2>
              <div className="mt-5">
                <span className="text-xs text-secondary">Followers</span>
                <strong className="mt-1 block text-2xl">
                  {followerCount === null ? '—' : followerCount.toLocaleString()}
                </strong>
                <p className="mt-1 text-[11px] text-muted">
                  {followerCount === null
                    ? 'Loading your current audience.'
                    : followerCount === 0
                      ? 'No followers will receive this broadcast yet.'
                      : `All ${followerCount.toLocaleString()} followers will receive this broadcast.`}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime/60 text-navy">
                <Lightbulb size={20} />
              </span>
              <div>
                <h2 className="text-base font-semibold">Delivery tips</h2>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-secondary">
                  <li>Keep it short and clear.</li>
                  <li>Include one key idea per broadcast.</li>
                  <li>
                    Schedule for your audience&apos;s peak time for higher
                    reach.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info-bg text-brand">
              <LockKeyhole size={21} />
            </span>
            <div>
              <strong className="text-xs">Only you can read this</strong>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                Your settings and analytics are private and encrypted.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
