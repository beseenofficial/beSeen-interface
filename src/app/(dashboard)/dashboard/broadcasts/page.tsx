'use client';

import { KeyRound, LockKeyhole, Radio, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { broadcastApi } from '@/lib/api';
import { decryptFeedItem, MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';
import { publishEncryptedBroadcast, resumeOrCancelDrafts } from '@/lib/broadcast-workflow';
import { useAuth } from '@/lib/blux';
import { utf8 } from '@/lib/encoding';
import { useToast } from '@/providers/toast-provider';
import type { BroadcastFeedItem, DecryptedBroadcast } from '@/types';

const timestamp = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

async function loadCompleteFeed(view: 'received' | 'sent'): Promise<BroadcastFeedItem[]> {
  const items: BroadcastFeedItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await broadcastApi.feed(view, cursor);
    items.push(...page.items);
    if (!page.hasMore) break;
    if (!page.nextCursor) throw new Error('The feed cursor is missing.');
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

export default function BroadcastsPage() {
  const { user, keys, completeSignIn } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'received' | 'sent'>('received');
  const [feeds, setFeeds] = useState<Record<'received' | 'sent', DecryptedBroadcast[] | null>>({
    received: null,
    sent: null,
  });
  const [error, setError] = useState<string | null>(null);
  const draftBytes = useMemo(() => utf8(draft).length, [draft]);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      if (keys) await resumeOrCancelDrafts(user, keys);
      const [received, sent] = await Promise.all([
        loadCompleteFeed('received'),
        loadCompleteFeed('sent'),
      ]);
      const [decryptedReceived, decryptedSent] = await Promise.all([
        Promise.all(received.map((item) => decryptFeedItem(item, keys))),
        Promise.all(sent.map((item) => decryptFeedItem(item, keys))),
      ]);
      setFeeds({ received: decryptedReceived, sent: decryptedSent });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your encrypted broadcasts could not be loaded.');
    }
  }, [keys, user]);

  useEffect(() => {
    void load();
  }, [load]);

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
      setError(cause instanceof Error ? cause.message : 'Your broadcast could not be published.');
    } finally {
      setSending(false);
    }
  }

  if (!user) return <LoadingState label="Loading your broadcasts…" />;
  const feed = feeds[view];

  return (
    <div className="mx-auto w-full max-w-260 px-12 pb-16 pt-12 max-[1180px]:px-8 max-sm:px-4 max-sm:pt-7.5">
      <PageHeader
        eyebrow="End-to-end encrypted"
        title="Broadcasts"
        description="Content is encrypted and signed in this browser. BeSeen stores ciphertext and wrapped keys only."
      />

      <form className="mb-5 rounded-2xl border border-border bg-white p-6 max-sm:p-4" onSubmit={publish}>
        <label className="grid gap-2 text-[13px] font-semibold">
          New broadcast
          <textarea
            className="min-h-28 w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm font-normal text-navy outline-none focus:border-brand"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write an encrypted update for your followers…"
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <span className={draftBytes > MAX_BROADCAST_BYTES ? 'text-xs text-error' : 'flex items-center gap-1.5 text-[11px] text-muted'}>
            <LockKeyhole size={13} /> Encrypted before it leaves this device · {draftBytes.toLocaleString()}/{MAX_BROADCAST_BYTES.toLocaleString()} bytes
          </span>
          {keys ? (
            <Button type="submit" loading={sending} disabled={!draft.trim() || draftBytes > MAX_BROADCAST_BYTES} icon={<Radio size={17} />}>
              Publish encrypted
            </Button>
          ) : (
            <Button type="button" icon={<KeyRound size={17} />} onClick={() => void completeSignIn()}>
              Reconnect wallet to publish
            </Button>
          )}
        </div>
      </form>

      {error && <ErrorState message={error} retry={() => void load()} />}

      <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Verified locally</span>
            <h2 className="text-[23px] font-semibold">Your feed</h2>
          </div>
          <div className="flex gap-2">
            {(['received', 'sent'] as const).map((item) => (
              <Button key={item} variant={view === item ? 'primary' : 'secondary'} onClick={() => setView(item)}>
                {item === 'received' ? 'Received' : 'Sent'}
              </Button>
            ))}
          </div>
        </div>

        {!keys && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-info-bg p-4 text-sm text-secondary">
            <span><KeyRound className="mr-2 inline" size={17} />Reconnect your wallet to unlock encrypted content.</span>
            <Button variant="secondary" onClick={() => void completeSignIn()}>Unlock</Button>
          </div>
        )}

        {!feed ? (
          <LoadingState label="Verifying encrypted broadcasts…" />
        ) : feed.length === 0 ? (
          <EmptyState title={`No ${view} broadcasts yet`} message="Encrypted broadcasts will appear here after publication." />
        ) : (
          <ul className="grid gap-3">
            {feed.map((item) => (
              <li className="flex gap-3.5 rounded-xl border border-border bg-subtle/60 p-4" key={item.id}>
                <Avatar username={item.creator.username} src={item.creator.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <strong className="text-sm">@{item.creator.username}</strong>
                    {item.creator.id === user.id && <StatusBadge tone="lilac">You</StatusBadge>}
                    <time className="text-[11px] text-muted" dateTime={item.publishedAt}>{timestamp.format(new Date(item.publishedAt))}</time>
                  </div>
                  {item.state === 'decrypted' ? (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-secondary">{item.content}</p>
                  ) : item.state === 'locked' ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning"><ShieldAlert size={14} />Encrypted — reconnect the registered wallet to unlock.</p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-error"><ShieldAlert size={14} />Hidden because signature or ciphertext verification failed.</p>
                  )}
                </div>
                {item.state === 'decrypted' && <ShieldCheck className="text-success" size={17} aria-label="Signature verified" />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
