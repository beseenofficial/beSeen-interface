'use client';

import {
  AlertCircle,
  BadgeCheck,
  CheckCheck,
  ChevronLeft,
  LoaderCircle,
  Radio,
  Send,
  UsersRound,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/avatar';
import { BROADCAST_REFRESH_INTERVAL_MS, loadCompleteBroadcastFeed } from '@/lib/broadcast-feed';
import { decryptFeedItem, MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';
import { publishEncryptedBroadcast, resumeOrCancelDrafts } from '@/lib/broadcast-workflow';
import { utf8 } from '@/lib/encoding';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';
import type { BroadcastRecipientSummary, DecryptedBroadcast, DerivedKeys, User } from '@/types';

const broadcastTime = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

type BroadcastChatProps = {
  user: User;
  keys: DerivedKeys;
  recipientDetails: Record<string, BroadcastRecipientSummary[]>;
  onRecipientsLoaded: (broadcastId: string, recipients: BroadcastRecipientSummary[]) => void;
  onBack: () => void;
};

type RecipientDetails = {
  audienceCount: number;
  recipients: BroadcastRecipientSummary[];
};

function RecipientDetailsDialog({
  details,
  onClose,
}: {
  details: RecipientDetails | null;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!details) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeButton.current?.focus());
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [details, onClose]);

  if (!details) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 grid place-items-center bg-navy/55 p-4" onMouseDown={onClose} role="presentation">
      <section className="flex max-h-[min(680px,88svh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-white" aria-labelledby={titleId} aria-modal="true" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <header className="flex items-start gap-3 border-b border-border bg-info-bg px-5 py-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white"><Radio size={19} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold" id={titleId}>Broadcast recipients</h2>
            <p className="mt-1 text-xs text-secondary">Sent to {details.audienceCount.toLocaleString()} {details.audienceCount === 1 ? 'person' : 'people'}</p>
          </div>
          <button ref={closeButton} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white text-secondary transition hover:border-brand hover:text-navy" aria-label="Close recipient details" onClick={onClose} type="button"><X size={17} /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-3">
          {details.recipients.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-secondary">This broadcast had no recipients.</p>
          ) : (
            <ul className="grid gap-1">
              {details.recipients.map((recipient) => (
                <li key={recipient.userId}>
                  <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5">
                    <Avatar className="size-9" username={recipient.username} size="sm" />
                    <span className="min-w-0 truncate text-sm font-semibold">@{recipient.username}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function BroadcastChat({
  user,
  keys,
  recipientDetails,
  onRecipientsLoaded,
  onBack,
}: BroadcastChatProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feed, setFeed] = useState<DecryptedBroadcast[] | null>(null);
  const [openDetails, setOpenDetails] = useState<RecipientDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const draftBytes = useMemo(() => utf8(draft).length, [draft]);

  const load = useCallback(async ({ resumeDrafts = false, silent = false } = {}) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!silent) setError(null);
    try {
      if (resumeDrafts) await resumeOrCancelDrafts(user, keys);
      const items = await loadCompleteBroadcastFeed('sent');
      setFeed(await Promise.all(items.map((item) => decryptFeedItem(item, keys))));
    } catch {
      if (!silent) setError('Broadcast could not be loaded. Please try again.');
    } finally {
      refreshInFlight.current = false;
    }
  }, [keys, user]);

  useEffect(() => {
    void load({ resumeDrafts: true });
    const refresh = () => {
      if (document.visibilityState === 'visible') void load({ silent: true });
    };
    const interval = window.setInterval(refresh, BROADCAST_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ block: 'end' });
  }, [feed]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || draftBytes > MAX_BROADCAST_BYTES) return;
    setSending(true);
    setError(null);
    try {
      const published = await publishEncryptedBroadcast(content, user, keys);
      onRecipientsLoaded(published.id, published.recipients);
      setDraft('');
      requestAnimationFrame(() => input.current?.focus());
      toast(
        'Broadcast sent',
        published.audience.count === 0
          ? 'Your update is published.'
          : `Sent to ${published.audience.count.toLocaleString()} follower${published.audience.count === 1 ? '' : 's'}.`,
      );
      await load({ silent: true });
    } catch {
      setError('Your broadcast could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!draft.trim() || sending || draftBytes > MAX_BROADCAST_BYTES) return;
    event.currentTarget.form?.requestSubmit();
  }

  const chronologicalFeed = feed ? [...feed].reverse() : null;

  return (
    <>
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[76px_minmax(0,1fr)_auto] bg-ice">
      <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5">
        <button className="mr-1 hidden size-10 cursor-pointer place-items-center rounded-xl border border-border bg-white max-[720px]:grid" onClick={onBack} aria-label="Back to conversations" type="button">
          <ChevronLeft size={20} />
        </button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white">
          <Radio size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 text-lg font-semibold">Broadcast <BadgeCheck className="fill-brand text-white" size={17} aria-label="Official" /></h1>
          <p className="mt-1 text-[11px] text-success">Official BeSeen channel</p>
        </div>
      </header>

      <main className="min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-ice px-7 py-6 max-sm:px-3" aria-live="polite">
        <div className="mx-auto w-full min-w-0 max-w-4xl">
          <div className="mx-auto mb-7 flex w-fit max-w-full items-center gap-3 rounded-2xl border border-brand/10 bg-info-bg px-4 py-3 text-xs text-secondary">
            <UsersRound className="shrink-0 text-brand" size={18} />
            <span>Send one update to everyone who follows you.</span>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-xs text-error" role="alert">
              <AlertCircle size={16} /> <span className="min-w-0 flex-1">{error}</span>
              <button className="font-semibold underline" onClick={() => void load()} type="button">Try again</button>
            </div>
          )}

          {!chronologicalFeed ? (
            <div className="grid min-h-56 place-items-center text-secondary" role="status"><LoaderCircle className="animate-spin" size={25} /></div>
          ) : chronologicalFeed.length === 0 ? (
            <div className="grid min-h-56 place-items-center text-center">
              <div><Radio className="mx-auto text-brand" size={28} /><h2 className="mt-3 text-base font-semibold">Your Broadcast channel is ready</h2><p className="mt-1 text-xs text-secondary">Share your first update with your followers.</p></div>
            </div>
          ) : (
            <div className="grid w-full min-w-0 gap-4">
              {chronologicalFeed.map((item) => {
                const own = item.viewerKey.source === 'creator';
                const recipients = recipientDetails[item.id];
                return (
                  <div className="grid min-w-0 gap-2" key={item.id}>
                  <article className={cn('flex w-full min-w-0', own ? 'justify-end' : 'justify-start')}>
                    <div className={cn('min-w-0 max-w-[min(62%,560px)] overflow-hidden rounded-2xl px-4 py-3 max-sm:max-w-[90%]', own ? 'rounded-br-md bg-info-bg text-navy' : 'rounded-bl-md bg-white text-navy')}>
                      {item.state === 'decrypted' ? (
                        <p className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">{item.content}</p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-muted"><AlertCircle size={16} /> Unable to decrypt this broadcast</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[10px] text-muted">
                        <time dateTime={item.publishedAt}>{broadcastTime.format(new Date(item.publishedAt))}</time>
                        {own && <CheckCheck size={15} aria-label="Sent" />}
                      </div>
                    </div>
                  </article>
                  {own && (
                    <article className="flex w-full min-w-0 justify-start" aria-label="BeSeen delivery confirmation">
                      <div className="min-w-0 max-w-[min(62%,560px)] rounded-2xl rounded-bl-md bg-white px-4 py-3 max-sm:max-w-[90%]">
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white"><Radio size={13} /></span>
                          <strong className="flex items-center gap-1 text-xs">BeSeen <BadgeCheck className="fill-brand text-white" size={14} aria-label="Official" /></strong>
                        </div>
                        <p className="mt-2 text-sm text-secondary">Your broadcast was sent to {item.manifest.audienceCount.toLocaleString()} {item.manifest.audienceCount === 1 ? 'person' : 'people'}.</p>
                        {recipients && (
                          <button className="mt-2 cursor-pointer text-xs font-semibold text-brand underline underline-offset-3" onClick={() => setOpenDetails({ audienceCount: item.manifest.audienceCount, recipients })} type="button">View details</button>
                        )}
                      </div>
                    </article>
                  )}
                  </div>
                );
              })}
              <div ref={messageEnd} />
            </div>
          )}
        </div>
      </main>

      <footer className="min-w-0 max-w-full overflow-x-hidden border-t border-border bg-white p-4">
        <form className="mx-auto grid min-w-0 max-w-4xl grid-cols-[minmax(0,1fr)_52px] items-end gap-3" onSubmit={publish}>
          <label className="relative block min-w-0">
            <span className="sr-only">Write a broadcast</span>
            <textarea ref={input} className="block min-h-12 max-h-36 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted focus:border-brand" maxLength={MAX_BROADCAST_BYTES} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Write an update…" rows={1} value={draft} />
            {draftBytes > MAX_BROADCAST_BYTES && <span className="pointer-events-none absolute bottom-2.5 right-3 text-[9px] text-error">Message is too long</span>}
          </label>
          <button className="grid size-13 cursor-pointer place-items-center rounded-xl border-0 bg-brand text-white transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45" disabled={sending || !draft.trim() || draftBytes > MAX_BROADCAST_BYTES} aria-label="Send broadcast" type="submit">
            {sending ? <LoaderCircle className="animate-spin" size={21} /> : <Send size={21} />}
          </button>
        </form>
      </footer>
    </div>
    <RecipientDetailsDialog details={openDetails} onClose={() => setOpenDetails(null)} />
    </>
  );
}
