'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { RecipientDetails } from '@/components/messenger/broadcast/recipient-details-modal';
import {
  BROADCAST_REFRESH_INTERVAL_MS,
  loadCompleteBroadcastFeed,
} from '@/lib/broadcast-feed';
import { decryptFeedItem, MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';
import {
  loadBroadcastRecipients,
  saveBroadcastRecipients,
} from '@/lib/broadcast-recipient-storage';
import { publishEncryptedBroadcast, resumeOrCancelDrafts } from '@/lib/broadcast-workflow';
import { utf8 } from '@/lib/encoding';
import { useToast } from '@/providers/toast-provider';
import type { BroadcastRecipientSummary, DecryptedBroadcast, DerivedKeys, User } from '@/types';

type UseBroadcastChatOptions = {
  user: User;
  keys: DerivedKeys;
};

export function useBroadcastChat({ user, keys }: UseBroadcastChatOptions) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feed, setFeed] = useState<DecryptedBroadcast[] | null>(null);
  const [recipientDetails, setRecipientDetails] = useState<
    Record<string, BroadcastRecipientSummary[]>
  >({});
  const [openDetails, setOpenDetails] = useState<RecipientDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const draftBytes = useMemo(() => utf8(draft).length, [draft]);

  const load = useCallback(
    async ({ resumeDrafts = false, silent = false } = {}) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (!silent) setError(null);
      try {
        if (resumeDrafts) await resumeOrCancelDrafts(user, keys);
        const items = await loadCompleteBroadcastFeed('sent');
        const decrypted = await Promise.all(
          items.map((item) => decryptFeedItem(item, keys)),
        );
        const storedRecipients = await Promise.all(
          decrypted
            .filter((item) => item.viewerKey.source === 'creator')
            .map(async (item) => ({
              broadcastId: item.id,
              recipients: await loadBroadcastRecipients(user.id, item.id),
            })),
        );
        setRecipientDetails((current) => {
          const restored = Object.fromEntries(
            storedRecipients
              .filter(
                (
                  entry,
                ): entry is {
                  broadcastId: string;
                  recipients: BroadcastRecipientSummary[];
                } => entry.recipients !== null,
              )
              .map(({ broadcastId, recipients }) => [
                broadcastId,
                recipients,
              ]),
          );
          return { ...restored, ...current };
        });
        setFeed(decrypted);
      } catch {
        if (!silent) setError('Broadcast could not be loaded. Please try again.');
      } finally {
        refreshInFlight.current = false;
      }
    },
    [keys, user],
  );

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
      setRecipientDetails((current) => ({
        ...current,
        [published.id]: published.recipients,
      }));
      await saveBroadcastRecipients(
        user.id,
        published.id,
        published.recipients,
      );
      setDraft('');
      requestAnimationFrame(() => {
        if (!input.current) return;
        input.current.style.height = 'auto';
        input.current.focus();
      });
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

  return {
    chronologicalFeed: feed ? [...feed].reverse() : null,
    draft,
    draftBytes,
    error,
    input,
    messageEnd,
    openDetails,
    recipientDetails,
    sending,
    handleKeyDown,
    load,
    publish,
    setDraft,
    setOpenDetails,
  };
}

export type BroadcastChatState = ReturnType<typeof useBroadcastChat>;
