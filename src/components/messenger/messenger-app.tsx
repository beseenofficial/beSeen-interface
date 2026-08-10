'use client';

import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Gift,
  Inbox,
  LoaderCircle,
  MessageCircleMore,
  Radio,
  Reply,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smile,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SecureLoadingScreen } from '@/components/ui/states';
import { BroadcastChat } from '@/components/messenger/broadcast-chat';
import { ProfileModal } from '@/components/messenger/profile-modal';
import { ApiError, messengerApi } from '@/lib/api';
import { BROADCAST_REFRESH_INTERVAL_MS, loadCompleteBroadcastFeed } from '@/lib/broadcast-feed';
import { decryptFeedItem } from '@/lib/broadcast-crypto';
import { useAuth } from '@/lib/blux';
import { decryptMessengerMessage, MAX_MESSENGER_BYTES } from '@/lib/messenger-crypto';
import { createReadCursorBatcher, startMessengerPolling } from '@/lib/messenger-polling';
import {
  applyClaimedBounty,
  applyUnlockedBounty,
  firstUnreadMessageId,
  mergeMessengerMessages,
  mergeMessengerTimeline,
} from '@/lib/messenger-state';
import {
  createAndSendMessengerMessage,
  discardPendingMessengerAttempt,
  loadPendingMessengerAttempt,
  retryPendingMessengerMessage,
} from '@/lib/messenger-workflow';
import { utf8 } from '@/lib/encoding';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';
import type {
  DecryptedMessengerMessage,
  DecryptedBroadcast,
  BroadcastRecipientSummary,
  MessengerBounty,
  MessengerBountyTerms,
  MessengerConversation,
  MessengerConversationContext,
  MessengerMessageHistoryItem,
  DerivedKeys,
  User,
} from '@/types';

const LIST_POLL_MS = 15_000;
const HISTORY_POLL_MS = 8_000;

function timeLabel(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function messengerError(cause: unknown): string {
  if (!(cause instanceof ApiError)) {
    return cause instanceof Error ? cause.message : 'Messenger could not complete this request.';
  }
  if (cause.code === 'ACTIVE_KEYS_NOT_FOUND') {
    return 'Messaging is not ready for this account yet. Ask them to sign in once, then try again.';
  }
  if (cause.code === 'MESSAGE_ID_CONFLICT') {
    return 'This message could not be sent. Discard it, then write a new one.';
  }
  if (cause.code === 'BOUNTY_NOT_CLAIMABLE') {
    return 'This reward is not ready yet. The other person needs to reply before time runs out.';
  }
  if (cause.code === 'BOUNTY_EXPIRED' || cause.status === 410) {
    return 'This reward has expired.';
  }
  if (cause.code === 'RATE_LIMIT_EXCEEDED' || cause.code === 'RATE_LIMITED' || cause.status === 429) {
    return 'Messenger is receiving too many requests. Wait a moment before retrying.';
  }
  if (cause.code === 'INVALID_MESSAGE_SIGNATURE') {
    return 'This message could not be sent. Please try again.';
  }
  if (cause.code === 'VALIDATION_ERROR') {
    return 'Check your message and reward details, then try again.';
  }
  return cause.message;
}

async function decryptItems(
  items: MessengerMessageHistoryItem[],
  keys: DerivedKeys,
  cache: Map<string, DecryptedMessengerMessage>,
): Promise<DecryptedMessengerMessage[]> {
  return Promise.all(
    items.map(async (item) => {
      const cached = cache.get(item.id);
      if (cached) {
        const refreshed = { ...cached, delivery: item.delivery, bounty: item.bounty };
        cache.set(item.id, refreshed);
        return refreshed;
      }
      const decrypted = await decryptMessengerMessage(item, keys);
      cache.set(item.id, decrypted);
      return decrypted;
    }),
  );
}

function BountyBadge({ bounty }: { bounty: MessengerBounty }) {
  const tones = {
    offered: 'border-lime/70 bg-lime/35 text-navy',
    claimable: 'border-success/30 bg-success-bg text-success',
    claimed: 'border-success/30 bg-success-bg text-success',
    expired: 'border-border bg-subtle text-muted',
  };
  const labels = {
    offered: 'Offered',
    claimable: 'Claimable',
    claimed: 'Claimed',
    expired: 'Expired',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', tones[bounty.status])}>
      <Gift size={12} aria-hidden="true" /> {labels[bounty.status]}
    </span>
  );
}

export function MessengerApp() {
  const { user, keys } = useAuth();
  if (!user || !keys) {
    return <SecureLoadingScreen label="Opening Messenger…" />;
  }
  return <MessengerWorkspace user={user} keys={keys} />;
}

function MessengerWorkspace({ user, keys }: { user: User; keys: DerivedKeys }) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [context, setContext] = useState<MessengerConversationContext | null>(null);
  const [messages, setMessages] = useState<DecryptedMessengerMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextBeforeSequence, setNextBeforeSequence] = useState<number | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendErrorCode, setSendErrorCode] = useState<string | null>(null);
  const [hasPendingRetry, setHasPendingRetry] = useState(false);
  const [replyTarget, setReplyTarget] = useState<DecryptedMessengerMessage | null>(null);
  const [showBounty, setShowBounty] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [bountyAsset, setBountyAsset] = useState('USDC');
  const [bountyAmount, setBountyAmount] = useState('10');
  const [bountyDuration, setBountyDuration] = useState('3600');
  const [claimingBountyId, setClaimingBountyId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [unreadMarker, setUnreadMarker] = useState<{ afterSequence: number; count: number } | null>(null);
  const [receivedBroadcasts, setReceivedBroadcasts] = useState<DecryptedBroadcast[]>([]);
  const [broadcastRecipientDetails, setBroadcastRecipientDetails] = useState<Record<string, BroadcastRecipientSummary[]>>({});
  const cache = useRef(new Map<string, DecryptedMessengerMessage>());
  const broadcastRefreshInFlight = useRef(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const readBatcher = useRef<ReturnType<typeof createReadCursorBatcher> | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const closeProfile = useCallback(() => setProfileUsername(null), []);

  const refreshReceivedBroadcasts = useCallback(async () => {
    if (broadcastRefreshInFlight.current) return;
    broadcastRefreshInFlight.current = true;
    try {
      const items = await loadCompleteBroadcastFeed('received');
      const decrypted = await Promise.all(items.map((item) => decryptFeedItem(item, keys)));
      setReceivedBroadcasts(decrypted);
    } finally {
      broadcastRefreshInFlight.current = false;
    }
  }, [keys]);

  const updateConversationPage = useCallback((page: Awaited<ReturnType<typeof messengerApi.listConversations>>) => {
    setConversations((current) => {
      const incomingIds = new Set(page.items.map((item) => item.id));
      return [...page.items, ...current.filter((item) => !incomingIds.has(item.id))];
    });
    setNextCursor(page.nextCursor);
    setHasMoreConversations(page.hasMore);
  }, []);

  const refreshConversationList = useCallback(async () => {
    const page = await messengerApi.listConversations({ limit: 20 });
    updateConversationPage(page);
    setListError(null);
  }, [updateConversationPage]);

  useEffect(() => {
    let active = true;
    const requestedConversation = new URLSearchParams(window.location.search).get('conversation');
    if (requestedConversation) {
      setBroadcastOpen(false);
      setActiveConversationId(requestedConversation.toLowerCase());
    }
    setListLoading(true);
    void refreshConversationList()
      .catch((cause) => {
        if (active) setListError(messengerError(cause));
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshConversationList]);

  useEffect(() => {
    if (listLoading) return;
    const poller = startMessengerPolling({ task: refreshConversationList, intervalMs: LIST_POLL_MS });
    return poller.stop;
  }, [listLoading, refreshConversationList]);

  useEffect(() => {
    if (broadcastOpen) return;
    void refreshReceivedBroadcasts().catch(() => undefined);
    const poller = startMessengerPolling({
      task: refreshReceivedBroadcasts,
      intervalMs: BROADCAST_REFRESH_INTERVAL_MS,
    });
    return poller.stop;
  }, [broadcastOpen, refreshReceivedBroadcasts]);

  const refreshHistory = useCallback(async (conversationId: string) => {
    const page = await messengerApi.messages(conversationId, { limit: 30 });
    const decrypted = await decryptItems(page.items, keys, cache.current);
    setMessages((current) => mergeMessengerMessages(current, decrypted));
    setHistoryError(null);
  }, [keys]);

  useEffect(() => {
    if (!activeConversationId) {
      setContext(null);
      setMessages([]);
      setUnreadMarker(null);
      return;
    }
    let active = true;
    const controller = new AbortController();
    cache.current.clear();
    setHistoryLoading(true);
    setHistoryError(null);
    setReplyTarget(null);
    setShowBounty(false);
    setShowEmojiPicker(false);
    setSendError(null);
    setMessages([]);
    void Promise.all([
      messengerApi.conversation(activeConversationId, controller.signal),
      messengerApi.context(activeConversationId, controller.signal),
      messengerApi.messages(activeConversationId, { limit: 30 }, controller.signal),
      loadPendingMessengerAttempt(activeConversationId),
    ])
      .then(async ([conversation, loadedContext, history, pending]) => {
        const decrypted = await decryptItems(history.items, keys, cache.current);
        if (!active) return;
        setConversations((current) => {
          const rest = current.filter((item) => item.id !== conversation.id);
          return [conversation, ...rest];
        });
        setContext(loadedContext);
        setUnreadMarker(
          conversation.unreadCount > 0
            ? {
                afterSequence: conversation.readState.viewerReadSequence,
                count: conversation.unreadCount,
              }
            : null,
        );
        setMessages(decrypted.sort((left, right) => right.sequence - left.sequence));
        setNextBeforeSequence(history.nextBeforeSequence);
        setHasMoreMessages(history.hasMore);
        setHasPendingRetry(Boolean(pending));
      })
      .catch((cause) => {
        if (!active || controller.signal.aborted) return;
        if (cause instanceof ApiError && (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)) {
          setConversations((current) => current.filter((item) => item.id !== activeConversationId));
          setActiveConversationId(null);
          toast('Conversation unavailable', 'It was removed from Messenger.');
          return;
        }
        setHistoryError(messengerError(cause));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeConversationId, keys, toast]);

  useEffect(() => {
    if (!activeConversationId || historyLoading) return;
    const poller = startMessengerPolling({
      intervalMs: HISTORY_POLL_MS,
      task: async () => {
        try {
          await refreshHistory(activeConversationId);
        } catch (cause) {
          if (cause instanceof ApiError && (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)) {
            setConversations((current) => current.filter((item) => item.id !== activeConversationId));
            setActiveConversationId(null);
            toast('Conversation unavailable', 'It was removed from Messenger.');
            return;
          }
          setHistoryError(messengerError(cause));
          throw cause;
        }
      },
    });
    return poller.stop;
  }, [activeConversationId, historyLoading, refreshHistory, toast]);

  useEffect(() => {
    readBatcher.current?.dispose();
    if (!activeConversationId) return;
    readBatcher.current = createReadCursorBatcher(async (throughSequence) => {
      const result = await messengerApi.markRead(activeConversationId, throughSequence);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                unreadCount: result.readState.unreadCount,
                readState: {
                  ...conversation.readState,
                  viewerReadSequence: result.readState.readSequence,
                },
              }
            : conversation,
        ),
      );
    });
    return () => readBatcher.current?.dispose();
  }, [activeConversationId]);

  useEffect(() => {
    if (historyLoading || messages.length === 0) return;
    const highestRendered = Math.max(...messages.map((message) => message.sequence));
    readBatcher.current?.push(highestRendered);
  }, [historyLoading, messages]);

  useEffect(() => {
    if (!historyLoading && !loadingOlder) {
      messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [historyLoading, loadingOlder, messages.length, receivedBroadcasts.length]);

  async function loadMoreConversations() {
    if (!nextCursor || loadingMoreConversations) return;
    setLoadingMoreConversations(true);
    try {
      const page = await messengerApi.listConversations({ limit: 20, cursor: nextCursor });
      setConversations((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !known.has(item.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMoreConversations(page.hasMore);
    } catch (cause) {
      setListError(messengerError(cause));
    } finally {
      setLoadingMoreConversations(false);
    }
  }

  async function loadOlderMessages() {
    if (!activeConversationId || !nextBeforeSequence || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messengerApi.messages(
        activeConversationId,
        { limit: 30, beforeSequence: nextBeforeSequence },
      );
      const decrypted = await decryptItems(page.items, keys, cache.current);
      setMessages((current) => mergeMessengerMessages(current, decrypted));
      setNextBeforeSequence(page.nextBeforeSequence);
      setHasMoreMessages(page.hasMore);
    } catch (cause) {
      setHistoryError(messengerError(cause));
    } finally {
      setLoadingOlder(false);
    }
  }

  const afterSuccessfulSend = useCallback(async (message: Awaited<ReturnType<typeof retryPendingMessengerMessage>>['message']) => {
    setHasPendingRetry(false);
    setSendError(null);
    setSendErrorCode(null);
    if (message.unlockedBounty) {
      setMessages((current) => applyUnlockedBounty(current, message.unlockedBounty!));
      toast('Reward unlocked', 'The other person can now collect this demo reward.');
    }
    if (activeConversationId) {
      await Promise.allSettled([
        refreshHistory(activeConversationId),
        refreshConversationList(),
      ]);
    }
  }, [activeConversationId, refreshConversationList, refreshHistory, toast]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeConversationId || sending || hasPendingRetry || !draft.trim()) return;
    setSending(true);
    setSendError(null);
    setSendErrorCode(null);
    const bounty: MessengerBountyTerms | null = showBounty
      ? {
          assetCode: bountyAsset,
          amount: bountyAmount,
          durationSeconds: Number(bountyDuration),
        }
      : null;
    try {
      const result = await createAndSendMessengerMessage({
        conversationId: activeConversationId,
        plaintext: draft,
        keys,
        replyToMessageId: replyTarget?.id ?? null,
        bounty,
      });
      setDraft('');
      if (messageInput.current) messageInput.current.style.height = 'auto';
      setReplyTarget(null);
      setShowBounty(false);
      requestAnimationFrame(() => messageInput.current?.focus());
      await afterSuccessfulSend(result.message);
    } catch (cause) {
      if (cause instanceof ApiError && (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)) {
        setConversations((current) => current.filter((item) => item.id !== activeConversationId));
        setActiveConversationId(null);
        toast('Conversation unavailable', 'It was removed from Messenger.');
        return;
      }
      const pending = await loadPendingMessengerAttempt(activeConversationId);
      setHasPendingRetry(Boolean(pending));
      if (pending) setDraft('');
      setSendError(messengerError(cause));
      setSendErrorCode(cause instanceof ApiError ? cause.code : 'NETWORK_UNKNOWN');
    } finally {
      setSending(false);
    }
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (sending || hasPendingRetry || !draft.trim() || draftBytes > MAX_MESSENGER_BYTES) return;
    event.currentTarget.form?.requestSubmit();
  }

  function insertEmoji(emoji: string) {
    setDraft((current) => `${current}${emoji}`);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => messageInput.current?.focus());
  }

  async function retrySend() {
    if (!activeConversationId || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await retryPendingMessengerMessage(activeConversationId);
      await afterSuccessfulSend(result.message);
    } catch (cause) {
      setSendError(messengerError(cause));
      setSendErrorCode(cause instanceof ApiError ? cause.code : 'NETWORK_UNKNOWN');
    } finally {
      setSending(false);
    }
  }

  async function discardRetry() {
    if (!activeConversationId) return;
    await discardPendingMessengerAttempt(activeConversationId);
    setHasPendingRetry(false);
    setSendError(null);
    setSendErrorCode(null);
  }

  async function claimBounty(bounty: MessengerBounty) {
    setClaimingBountyId(bounty.id);
    try {
      const result = await messengerApi.claimBounty(bounty.id);
      setMessages((current) => applyClaimedBounty(current, result.bounty));
      toast(
        result.claimedNow ? 'Demo bounty claimed' : 'Demo bounty already claimed',
        'This is a demo reward. No real funds were moved.',
      );
    } catch (cause) {
      setHistoryError(messengerError(cause));
    } finally {
      setClaimingBountyId(null);
    }
  }

  const filteredConversations = conversations.filter((conversation) => {
    if (filter === 'unread' && conversation.unreadCount === 0) return false;
    return conversation.otherParticipant.username.toLowerCase().includes(search.trim().toLowerCase());
  });
  const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const draftBytes = utf8(draft).length;
  const otherParticipant = context?.otherParticipant ?? activeConversation?.otherParticipant ?? null;
  const timelineItems = mergeMessengerTimeline(messages, receivedBroadcasts, otherParticipant?.id ?? null);
  const unreadMessageId = firstUnreadMessageId(
    messages,
    user.id,
    unreadMarker?.afterSequence ?? null,
  );

  return (
    <section className="grid h-svh min-h-[620px] min-w-0 grid-cols-[360px_minmax(0,1fr)] overflow-hidden bg-white max-[1200px]:grid-cols-[340px_minmax(0,1fr)] max-[900px]:h-[calc(100svh-68px)] max-[900px]:grid-cols-[300px_minmax(0,1fr)] max-[720px]:grid-cols-1" aria-label="BeSeen Messenger">
      <aside className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-subtle', (broadcastOpen || activeConversationId) && 'max-[720px]:hidden')}>
        <div className="border-b border-border px-4 pb-3 pt-5">
          <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Messages</h1>{totalUnread > 0 && <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white" aria-label={`${totalUnread} unread messages`}>{totalUnread}</span>}</div>
          <label className="mt-4 flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 text-secondary transition focus-within:border-brand">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search conversations</span>
            <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" />
          </label>
          <div className="mt-3 inline-flex rounded-xl border border-border bg-white p-1" aria-label="Conversation filters">
            {(['all', 'unread'] as const).map((value) => (
              <button className={cn('min-h-8 cursor-pointer rounded-lg px-4 text-xs font-semibold capitalize transition', filter === value ? 'bg-info-bg text-brand' : 'text-secondary hover:text-brand')} key={value} onClick={() => setFilter(value)} type="button">
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5" aria-live="polite">
          <ul className="mb-1 grid gap-1">
            <li>
              <button className={cn('grid min-h-16 w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left transition', broadcastOpen ? 'border-brand bg-info-bg' : 'border-transparent hover:bg-white')} onClick={() => { setActiveConversationId(null); setBroadcastOpen(true); }} type="button">
                <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand"><Radio size={18} aria-hidden="true" /></span>
                <span className="min-w-0">
                  <strong className="flex items-center gap-1 truncate text-sm">Broadcast <BadgeCheck className="fill-brand text-white" size={15} aria-label="Official" /></strong>
                  <span className="mt-1 block truncate text-xs text-muted">Share with your followers</span>
                </span>
              </button>
            </li>
          </ul>
          {listLoading ? (
            <div className="grid min-h-32 place-items-center text-secondary" role="status"><LoaderCircle className="animate-spin" size={24} /></div>
          ) : listError && conversations.length === 0 ? (
            <div className="m-2 rounded-2xl border border-error/20 bg-error-bg p-4 text-sm text-error" role="alert">
              <p>{listError}</p>
              <button className="mt-3 font-semibold underline" onClick={() => void refreshConversationList()} type="button">Try again</button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="grid min-h-40 place-items-center px-5 text-center text-secondary">
              <div><Inbox className="mx-auto text-brand" size={24} /><p className="mt-3 text-sm font-semibold text-navy">No direct messages yet</p><p className="mt-1 text-xs">Get a creator&apos;s token to start chatting.</p></div>
            </div>
          ) : (
            <ul className="grid gap-1">
              {filteredConversations.map((conversation) => {
                const selected = conversation.id === activeConversationId;
                return (
                  <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={conversation.id}>
                    <div className={cn('grid min-h-16 w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left transition', selected && !broadcastOpen ? 'border-brand bg-info-bg' : 'border-transparent hover:bg-white')} onClick={() => { setBroadcastOpen(false); setActiveConversationId(conversation.id); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setBroadcastOpen(false); setActiveConversationId(conversation.id); } }} role="button" tabIndex={0}>
                      <Avatar username={conversation.otherParticipant.username} src={conversation.otherParticipant.avatar} size="sm" className="size-10" />
                      <span className="min-w-0">
                        <strong className="block max-w-full truncate text-sm font-semibold">@{conversation.otherParticipant.username}</strong>
                        <span className="mt-1 block truncate text-xs text-muted">{conversation.lastMessage ? 'Encrypted message' : 'Ready to chat'}</span>
                      </span>
                      <span className="grid justify-items-end gap-1 text-[10px] text-muted">
                        <time>{timeLabel(conversation.lastMessageAt ?? conversation.createdAt)}</time>
                        {conversation.unreadCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 py-0.5 font-semibold text-white">{conversation.unreadCount}</span>}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
          {hasMoreConversations && (
            <Button className="mt-3 w-full" loading={loadingMoreConversations} onClick={() => void loadMoreConversations()} variant="tertiary">Load more</Button>
          )}
        </div>
      </aside>

      <div className={cn('min-h-0 min-w-0 max-w-full overflow-hidden bg-ice', !broadcastOpen && !activeConversationId && 'max-[720px]:hidden')}>
        {broadcastOpen ? (
          <BroadcastChat
            user={user}
            keys={keys}
            recipientDetails={broadcastRecipientDetails}
            onRecipientsLoaded={(broadcastId, recipients) => {
              setBroadcastRecipientDetails((current) => ({ ...current, [broadcastId]: recipients }));
            }}
            onBack={() => setBroadcastOpen(false)}
          />
        ) : !activeConversationId ? (
          <div className="grid h-full place-items-center bg-ice p-8 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-info-bg text-brand"><MessageCircleMore size={30} /></span>
              <h1 className="mt-5 text-2xl font-semibold">Your conversations</h1>
              <p className="mt-2 text-sm leading-6 text-secondary">Chat one-to-one with creators whose tokens you own.</p>
            </div>
          </div>
        ) : (
          <motion.div className="grid h-full min-h-0 min-w-0 grid-rows-[76px_minmax(0,1fr)_auto] bg-ice" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <header className="flex min-w-0 items-center gap-3 border-b border-border bg-white px-5">
              <button className="mr-1 hidden size-10 cursor-pointer place-items-center rounded-full bg-subtle max-[720px]:grid" onClick={() => setActiveConversationId(null)} aria-label="Back to conversations" type="button"><ChevronLeft size={20} /></button>
              {otherParticipant ? (
                <button className="cursor-pointer rounded-full" onClick={() => setProfileUsername(otherParticipant.username)} aria-label={`View @${otherParticipant.username} profile`} type="button"><Avatar className="size-10" username={otherParticipant.username} src={otherParticipant.avatar} size="md" /></button>
              ) : <span className="size-11 animate-pulse rounded-full bg-disabled" />}
              <button className="min-w-0 text-left" disabled={!otherParticipant} onClick={() => otherParticipant && setProfileUsername(otherParticipant.username)} type="button">
                <h1 className="truncate text-base font-semibold transition hover:text-brand">{otherParticipant ? `@${otherParticipant.username}` : 'Loading conversation…'}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted"><ShieldCheck className="text-brand" size={13} /> Encrypted in browser</p>
              </button>
            </header>

            <main className="min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-ice px-6 py-5 max-sm:px-3" aria-live="polite">
              {hasMoreMessages && (
                <div className="mb-5 text-center"><Button loading={loadingOlder} onClick={() => void loadOlderMessages()} variant="tertiary">Load earlier messages</Button></div>
              )}
              {historyLoading ? (
                <div className="grid min-h-64 place-items-center text-secondary" role="status"><div className="text-center"><LoaderCircle className="mx-auto animate-spin" size={26} /><p className="mt-3 text-sm">Loading messages…</p></div></div>
              ) : historyError && messages.length === 0 ? (
                <div className="mx-auto mt-12 max-w-md rounded-2xl border border-error/20 bg-error-bg p-5 text-center text-sm text-error" role="alert"><AlertCircle className="mx-auto" /><p className="mt-2">{historyError}</p></div>
              ) : timelineItems.length === 0 ? (
                <div className="grid min-h-64 place-items-center text-center text-secondary"><div><MessageCircleMore className="mx-auto text-brand" size={28} /><h2 className="mt-3 text-base font-semibold text-navy">Say hello</h2><p className="mt-1 text-xs">Start a conversation with @{otherParticipant?.username ?? 'this creator'}.</p></div></div>
              ) : (
                <div className="mx-auto grid w-full min-w-0 max-w-[860px] gap-3">
                  {timelineItems.map((item) => {
                    if (item.kind === 'broadcast') {
                      const broadcast = item.broadcast;
                      return (
                        <motion.article className="flex w-full min-w-0 justify-start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} key={`broadcast-${broadcast.id}`}>
                          <div className="min-w-0 max-w-[min(62%,560px)] overflow-hidden rounded-2xl rounded-bl-md bg-info-bg text-navy max-sm:max-w-[90%]">
                            <div className="flex min-w-0 items-center gap-2 border-b border-lilac bg-white px-4 py-3">
                              <span className="grid size-8 place-items-center rounded-full bg-brand text-white"><Radio size={15} /></span>
                              <div className="min-w-0 flex-1"><strong className="block text-xs">Broadcast</strong><span className="block text-[10px] text-muted">Shared with followers</span></div>
                              <time className="text-[10px] text-muted" dateTime={broadcast.publishedAt}>{timeLabel(broadcast.publishedAt)}</time>
                            </div>
                            <div className="px-4 py-3.5">
                              {broadcast.state === 'decrypted' ? <p className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">{broadcast.content}</p> : <p className="flex items-center gap-2 text-sm text-muted"><AlertCircle size={16} /> Unable to decrypt this broadcast</p>}
                            </div>
                          </div>
                        </motion.article>
                      );
                    }
                    const message = item.message;
                    const outgoing = message.manifest.senderId === user.id;
                    const reply = message.manifest.replyToMessageId ? messages.find((candidate) => candidate.id === message.manifest.replyToMessageId) : null;
                    const beneficiary = message.manifest.recipientId === user.id;
                    return (
                      <div className="contents" key={message.id}>
                      {message.id === unreadMessageId && unreadMarker && (
                        <motion.div className="flex w-full items-center gap-3 py-1" initial={{ opacity: 0, scaleX: 0.94 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.28 }} role="separator" aria-label={`${unreadMarker.count} unread ${unreadMarker.count === 1 ? 'message' : 'messages'}`}>
                          <span className="h-px min-w-0 flex-1 bg-brand/35" />
                          <span className="shrink-0 text-[11px] font-semibold text-brand">{unreadMarker.count} unread {unreadMarker.count === 1 ? 'message' : 'messages'}</span>
                          <span className="h-px min-w-0 flex-1 bg-brand/35" />
                        </motion.div>
                      )}
                      <motion.article className={cn('group flex w-full min-w-0', outgoing ? 'justify-end' : 'justify-start')} initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                        <div className={cn('min-w-0 max-w-[min(62%,560px)] overflow-hidden rounded-2xl px-4 py-3 max-sm:max-w-[90%]', outgoing ? 'rounded-br-md bg-info-bg text-navy' : 'rounded-bl-md bg-white text-navy')}>
                          {message.manifest.replyToMessageId && (
                            <div className={cn('mb-2 rounded-xl border-l-2 px-3 py-2 text-xs', outgoing ? 'border-brand/60 bg-white/65 text-secondary' : 'border-brand bg-info-bg text-secondary')}>
                              <span className="block font-semibold">Reply</span>
                              <span className="mt-0.5 block truncate">{reply?.state === 'decrypted' ? reply.plaintext : 'Earlier message'}</span>
                            </div>
                          )}
                          {message.state === 'decrypted' ? (
                            <p className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]">{message.plaintext}</p>
                          ) : (
                            <p className="flex items-center gap-2 text-sm text-muted"><AlertCircle size={16} /> Unable to decrypt this message</p>
                          )}
                          {message.bounty && (
                            <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-border bg-white text-navy">
                              <div className="flex min-w-0 items-center gap-2.5 bg-lime/45 px-3.5 py-3">
                                <Gift className="shrink-0" size={17} />
                                <strong className="min-w-0 flex-1 text-xs">Demo bounty · {message.bounty.amount} {message.bounty.assetCode}</strong>
                                <BountyBadge bounty={message.bounty} />
                              </div>
                              <div className="px-3.5 py-2.5">
                                <p className="text-[11px] leading-4 text-secondary">This is demo metadata only.</p>
                                <p className="mt-1 text-[10px] text-muted">No real payment or escrow will be made.</p>
                              </div>
                              {beneficiary && message.bounty.status === 'claimable' && (
                                <button className="mx-3.5 mb-3.5 flex min-h-10 w-[calc(100%-1.75rem)] cursor-pointer items-center justify-center rounded-xl bg-success px-3 text-xs font-semibold text-white transition hover:bg-[#10704f] disabled:opacity-50" disabled={claimingBountyId === message.bounty.id} onClick={() => void claimBounty(message.bounty!)} type="button">
                                  {claimingBountyId === message.bounty.id ? 'Claiming…' : 'Claim demo bounty'}
                                </button>
                              )}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted">
                            <button className="mr-auto inline-flex cursor-pointer items-center gap-1 text-brand opacity-0 transition group-hover:opacity-100 focus:opacity-100" onClick={() => setReplyTarget(message)} type="button"><Reply size={13} /> Reply</button>
                            <time>{timeLabel(message.createdAt)}</time>
                            {outgoing && <span>{message.delivery.seenByRecipient ? 'Seen' : 'Sent'}</span>}
                            {outgoing && (message.delivery.seenByRecipient ? <CheckCheck size={15} aria-label="Seen" /> : <Check size={15} aria-label="Sent" />)}
                          </div>
                        </div>
                      </motion.article>
                      </div>
                    );
                  })}
                  <div ref={messageEnd} />
                </div>
              )}
            </main>

            <footer className="min-w-0 max-w-full overflow-x-hidden border-t border-border bg-white px-4 py-2">
              {historyError && messages.length > 0 && <p className="mb-2 text-xs text-error" role="alert">{historyError}</p>}
              {hasPendingRetry && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-bg px-3 py-2 text-xs text-warning" role="alert">
                  <RotateCcw size={16} />
                  <span className="min-w-0 flex-1">{sendError ?? 'We could not confirm whether this message was sent.'}</span>
                  {sendErrorCode !== 'MESSAGE_ID_CONFLICT' && <button className="font-semibold underline" disabled={sending} onClick={() => void retrySend()} type="button">Try again</button>}
                  <button className="font-semibold underline" disabled={sending} onClick={() => void discardRetry()} type="button">Discard</button>
                </div>
              )}
              {sendError && !hasPendingRetry && <p className="mb-2 text-xs text-error" role="alert">{sendError}</p>}
              <AnimatePresence initial={false}>
                {replyTarget && (
                  <motion.div className="mx-auto mb-2 flex max-w-[860px] items-center gap-3 overflow-hidden rounded-xl border-l-2 border-brand bg-white px-3 py-2 text-xs text-secondary" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                    <Reply className="shrink-0 text-brand" size={17} />
                    <span className="min-w-0 flex-1"><strong className="block text-brand">@{otherParticipant?.username ?? 'message'}</strong><span className="mt-0.5 block truncate">{replyTarget.state === 'decrypted' ? replyTarget.plaintext : 'Message unavailable'}</span></span>
                    <button className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-white hover:text-navy" onClick={() => setReplyTarget(null)} aria-label="Cancel reply" type="button"><X size={16} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <form className="mx-auto grid w-full max-w-[860px] grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-2xl border border-border bg-white p-2 transition focus-within:border-brand/35 max-sm:grid-cols-[40px_minmax(0,1fr)_auto]" onSubmit={sendMessage}>
                <div className="relative col-start-1 row-start-1">
                  <button className={cn('grid size-11 cursor-pointer place-items-center rounded-xl border transition max-sm:size-10', showEmojiPicker ? 'border-brand bg-info-bg text-brand' : 'border-border bg-white text-secondary hover:border-brand/40 hover:text-brand')} disabled={hasPendingRetry} onClick={() => setShowEmojiPicker((current) => !current)} aria-label="Choose emoji" aria-expanded={showEmojiPicker} type="button"><Smile size={20} /></button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div className="absolute bottom-full left-0 z-20 mb-2 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-white p-2 shadow-elevated" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.18 }} role="menu" aria-label="Emoji picker">
                        {['🙂', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍'].map((emoji) => <button className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg transition hover:bg-subtle" key={emoji} onClick={() => insertEmoji(emoji)} role="menuitem" type="button">{emoji}</button>)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <label className="relative col-start-2 row-start-1 block min-w-0 max-sm:col-span-2">
                  <span className="sr-only">Write a message</span>
                  <textarea ref={messageInput} className="block min-h-11 max-h-32 w-full resize-none overflow-y-auto rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60" disabled={hasPendingRetry} maxLength={MAX_MESSENGER_BYTES} onChange={(event) => { setDraft(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`; }} onKeyDown={handleMessageKeyDown} placeholder="Write an encrypted message..." rows={1} value={draft} />
                  {draftBytes > MAX_MESSENGER_BYTES && <span className="pointer-events-none absolute bottom-2.5 right-3 text-[9px] text-error">Message is too long</span>}
                </label>
                <AnimatePresence initial={false} mode="wait">
                  {showBounty ? (
                    <motion.div className="col-start-3 row-start-1 flex min-w-0 justify-self-end gap-2 max-[1450px]:col-span-4 max-[1450px]:col-start-1 max-[1450px]:row-start-2 max-[1450px]:w-full max-[1450px]:justify-end max-[1450px]:overflow-x-auto" key="bounty-settings" initial={{ opacity: 0, x: 10, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 8, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} aria-label="Demo reward settings" id="bounty-settings">
                      <label className="relative flex min-h-11 w-29 shrink-0 items-center rounded-xl border border-border bg-white pl-9 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35">
                        <CircleDollarSign className="absolute left-2.5 text-brand" size={20} aria-hidden="true" />
                        <span className="sr-only">Bounty asset</span>
                        <select className="w-full cursor-pointer appearance-none bg-transparent outline-none" value={bountyAsset} onChange={(event) => setBountyAsset(event.target.value)} aria-label="Bounty asset"><option value="USDC">USDC</option></select>
                        <ChevronDown className="pointer-events-none absolute right-2 text-muted" size={15} aria-hidden="true" />
                      </label>
                      <label className="relative flex min-h-11 w-19 shrink-0 items-center rounded-xl border border-border bg-white px-3 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35">
                        <span className="sr-only">Bounty amount</span>
                        <select className="w-full cursor-pointer appearance-none bg-transparent outline-none" value={bountyAmount} onChange={(event) => setBountyAmount(event.target.value)} aria-label="Bounty amount"><option value="5">5</option><option value="10">10</option><option value="25">25</option></select>
                        <ChevronDown className="pointer-events-none absolute right-2 text-muted" size={15} aria-hidden="true" />
                      </label>
                      <label className="relative flex min-h-11 w-21 shrink-0 items-center rounded-xl border border-border bg-white px-3 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35">
                        <span className="sr-only">Time to reply</span>
                        <select className="w-full cursor-pointer appearance-none bg-transparent outline-none" value={bountyDuration} onChange={(event) => setBountyDuration(event.target.value)} aria-label="Time to reply"><option value="3600">1h</option><option value="86400">1d</option><option value="604800">1w</option><option value="2592000">30d</option></select>
                        <ChevronDown className="pointer-events-none absolute right-2 text-muted" size={15} aria-hidden="true" />
                      </label>
                      <button className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-brand/20 bg-info-bg text-brand transition hover:border-brand/40" onClick={() => setShowBounty(false)} aria-label="Remove bounty" type="button"><Gift size={19} /></button>
                    </motion.div>
                  ) : (
                    <motion.button className="col-start-3 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-semibold text-navy transition hover:border-lime hover:bg-lime/15 max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-end" key="bounty-trigger" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16 }} onClick={() => setShowBounty(true)} aria-expanded="false" aria-controls="bounty-settings" type="button"><Gift className="text-warning" size={17} /> Demo bounty</motion.button>
                  )}
                </AnimatePresence>
                <motion.button className={cn('col-start-4 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45', showBounty ? 'max-[1450px]:row-start-1 max-sm:col-span-3 max-sm:col-start-1 max-sm:row-start-3 max-sm:w-full' : 'max-sm:col-start-3 max-sm:row-start-2')} whileTap={{ scale: 0.97 }} disabled={sending || hasPendingRetry || !draft.trim() || draftBytes > MAX_MESSENGER_BYTES} aria-label="Send message" type="submit">{sending ? <LoaderCircle className="animate-spin" size={19} /> : <Send size={19} />}<span>Send</span></motion.button>
              </form>
            </footer>
          </motion.div>
        )}
      </div>
      <ProfileModal username={profileUsername} onClose={closeProfile} />
    </section>
  );
}
