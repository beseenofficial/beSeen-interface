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
import { publishEncryptedBroadcast, resumeOrCancelDrafts } from '@/lib/broadcast-workflow';
import { utf8 } from '@/lib/encoding';
import { useToast } from '@/providers/toast-provider';
import type { BroadcastRecipientSummary, DecryptedBroadcast, DerivedKeys, User } from '@/types';

type UseBroadcastChatOptions = {
  user: User;
  keys: DerivedKeys;
  onRecipientsLoaded: (broadcastId: string, recipients: BroadcastRecipientSummary[]) => void;
};

export function useBroadcastChat({ user, keys, onRecipientsLoaded }: UseBroadcastChatOptions) {
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

  const load = useCallback(
    async ({ resumeDrafts = false, silent = false } = {}) => {
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
      onRecipientsLoaded(published.id, published.recipients);
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
    sending,
    handleKeyDown,
    load,
    publish,
    setDraft,
    setOpenDetails,
  };
}

export type BroadcastChatState = ReturnType<typeof useBroadcastChat>;
