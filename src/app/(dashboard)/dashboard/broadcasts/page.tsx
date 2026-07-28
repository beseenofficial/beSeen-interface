'use client';

import { LockKeyhole, Radio, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import { decryptBroadcast, encryptForRecipient } from '@/lib/broadcast-crypto';
import { useToast } from '@/providers/toast-provider';
import type { DecryptedBroadcast } from '@/types';

const MAX_LENGTH = 2000;

const timestamp = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function BroadcastsPage() {
  const { user, keypair } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feed, setFeed] = useState<DecryptedBroadcast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch everything addressed to this account and decrypt it locally with
   * the derived secret key — the server only ever handed us ciphertext.
   */
  const load = useCallback(async () => {
    if (!keypair) return;
    setError(null);
    try {
      const inbox = await api.getInbox(keypair.publicKey());
      const items = await Promise.all(
        inbox.map(async (item): Promise<DecryptedBroadcast> => {
          try {
            return { ...item, content: await decryptBroadcast(keypair, item.ciphertext) };
          } catch {
            // Encrypted for a key this device no longer has — show the
            // failure instead of hiding the item.
            return { ...item, content: null };
          }
        }),
      );
      setFeed(items);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your encrypted broadcasts could not be loaded.',
      );
    }
  }, [keypair]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !user || !keypair) return;

    setSending(true);
    setError(null);
    try {
      // One encrypted copy for ourselves (so we can reread it) and one per
      // follower public key. The plaintext never leaves this function.
      const followers = await api.getFollowers(user.id);
      const recipients = [
        keypair.publicKey(),
        ...followers.map((follower) => follower.derivedPublicKey),
      ].filter((key, index, all) => all.indexOf(key) === index);

      const copies = await Promise.all(
        recipients.map(async (recipientPublicKey) => ({
          recipientPublicKey,
          ciphertext: await encryptForRecipient(recipientPublicKey, content),
        })),
      );
      await api.publishBroadcast({ senderId: user.id, copies });
      setDraft('');
      toast(
        'Broadcast published',
        `Encrypted separately for you and ${followers.length} follower${followers.length === 1 ? '' : 's'}.`,
      );
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

  if (!user || !keypair) return <LoadingState label="Loading your broadcasts…" />;

  return (
    <div className="mx-auto w-full max-w-260 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="End-to-end encrypted"
        title="Broadcasts"
        description="Messages are encrypted in your browser for you and each follower. BeSeen only ever stores ciphertext."
      />

      <form
        className="mb-5 rounded-2xl border border-border bg-white p-6 max-sm:p-4"
        onSubmit={publish}
      >
        <label className="grid gap-2 text-[13px] font-semibold">
          New broadcast
          <textarea
            className="min-h-28 w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm font-normal text-navy outline-none transition-[border,box-shadow] placeholder:text-[#969db0] focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]"
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write an encrypted update for your followers…"
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <LockKeyhole size={13} />
            Encrypted before it leaves this device · {draft.length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            loading={sending}
            disabled={!draft.trim()}
            icon={<Radio size={17} />}
          >
            Publish encrypted
          </Button>
        </div>
      </form>

      {error && <ErrorState message={error} retry={() => void load()} />}

      <section className="rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
              Decrypted on this device
            </span>
            <h2 className="text-[23px] font-semibold">Your feed</h2>
          </div>
          <StatusBadge tone="success">
            <ShieldCheck size={13} /> Only you can read this
          </StatusBadge>
        </div>

        {!feed ? (
          <LoadingState label="Decrypting broadcasts…" />
        ) : feed.length === 0 ? (
          <EmptyState
            title="No broadcasts yet"
            message="Your encrypted messages — and the ones people you follow send you — will appear here."
          />
        ) : (
          <ul className="grid gap-3">
            {feed.map((item) => {
              const own = item.sender.id === user.id;
              return (
                <li
                  className="flex gap-3.5 rounded-xl border border-border bg-subtle/60 p-4 max-sm:p-3.5"
                  key={item.id}
                >
                  <Avatar
                    username={item.sender.username}
                    src={item.sender.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <strong className="text-sm">@{item.sender.username}</strong>
                      {own && <StatusBadge tone="lilac">You</StatusBadge>}
                      <time
                        className="text-[11px] text-muted"
                        dateTime={item.createdAt}
                      >
                        {timestamp.format(new Date(item.createdAt))}
                      </time>
                    </div>
                    {item.content !== null ? (
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-secondary">
                        {item.content}
                      </p>
                    ) : (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                        <ShieldAlert size={14} />
                        Encrypted for a key this device doesn&apos;t hold.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
