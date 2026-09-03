'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  decryptMessengerItems,
  HISTORY_POLL_MS,
  messengerError,
} from '@/components/messenger/messenger-view-utils';
import { useConversationList } from '@/components/messenger/use-conversation-list';
import { useMessageComposer } from '@/components/messenger/use-message-composer';
import { ApiError, messengerApi } from '@/lib/api';
import {
  BROADCAST_REFRESH_INTERVAL_MS,
  loadCompleteBroadcastFeed,
} from '@/lib/broadcast-feed';
import { decryptFeedItem } from '@/lib/broadcast-crypto';
import {
  createReadCursorBatcher,
  startMessengerPolling,
} from '@/lib/messenger-polling';
import {
  applyClaimedBounty,
  firstUnreadMessageId,
  mergeMessengerMessages,
  mergeMessengerTimeline,
} from '@/lib/messenger-state';
import { loadPendingMessengerAttempt } from '@/lib/messenger-workflow';
import { useAuth } from '@/lib/blux';
import { invalidateData } from '@/lib/data-invalidation';
import { useToast } from '@/providers/toast-provider';
import type {
  BroadcastRecipientSummary,
  DecryptedBroadcast,
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerBounty,
  MessengerConversationContext,
  User,
} from '@/types';

export function useMessengerWorkspace(user: User, keys: DerivedKeys) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const conversationList = useConversationList();
  const {
    activeConversation,
    activeConversationId,
    broadcastOpen,
    refreshConversationList,
    setActiveConversationId,
    setConversations,
  } = conversationList;
  const [context, setContext] = useState<MessengerConversationContext | null>(null);
  const [messages, setMessages] = useState<DecryptedMessengerMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextBeforeSequence, setNextBeforeSequence] = useState<number | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [claimingBountyId, setClaimingBountyId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [unreadMarker, setUnreadMarker] = useState<{ afterSequence: number; count: number } | null>(null);
  const [receivedBroadcasts, setReceivedBroadcasts] = useState<DecryptedBroadcast[]>([]);
  const [broadcastRecipientDetails, setBroadcastRecipientDetails] = useState<Record<string, BroadcastRecipientSummary[]>>({});
  const cache = useRef(new Map<string, DecryptedMessengerMessage>());
  const broadcastRefreshInFlight = useRef(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  const readBatcher = useRef<ReturnType<typeof createReadCursorBatcher> | null>(null);
  const refreshedExpiredBounties = useRef(new Set<string>());

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

  useEffect(() => {
    if (broadcastOpen) return;
    void refreshReceivedBroadcasts().catch(() => undefined);
    const poller = startMessengerPolling({
      task: refreshReceivedBroadcasts,
      intervalMs: BROADCAST_REFRESH_INTERVAL_MS,
    });
    return poller.stop;
  }, [broadcastOpen, refreshReceivedBroadcasts]);

  const refreshHistory = useCallback(
    async (conversationId: string) => {
      const page = await messengerApi.messages(conversationId, { limit: 30 });
      const decrypted = await decryptMessengerItems(page.items, keys, cache.current);
      setMessages((current) => mergeMessengerMessages(current, decrypted));
      setHistoryError(null);
    },
    [keys],
  );

  const composer = useMessageComposer({
    activeConversationId,
    keys,
    setActiveConversationId,
    setConversations,
    setMessages,
    refreshHistory,
    refreshConversationList,
    toast,
    demoUsdcBalance: user.demoUsdcBalance,
    refreshCurrentUser: refreshUser,
  });
  const {
    setHasPendingRetry,
    setReplyTarget,
    setSendError,
    setShowBounty,
    setBountyPanelOpen,
    setShowEmojiPicker,
  } = composer;

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
    setBountyPanelOpen(false);
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
        const decrypted = await decryptMessengerItems(history.items, keys, cache.current);
        if (!active) return;
        setConversations((current) => {
          const exists = current.some((item) => item.id === conversation.id);
          return exists
            ? current.map((item) =>
                item.id === conversation.id ? conversation : item,
              )
            : [...current, conversation];
        });
        setContext(loadedContext);
        setUnreadMarker(
          conversation.unreadCount > 0
            ? { afterSequence: conversation.readState.viewerReadSequence, count: conversation.unreadCount }
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
  }, [
    activeConversationId,
    keys,
    setActiveConversationId,
    setConversations,
    setHasPendingRetry,
    setReplyTarget,
    setSendError,
    setShowBounty,
    setBountyPanelOpen,
    setShowEmojiPicker,
    toast,
  ]);

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
  }, [
    activeConversationId,
    historyLoading,
    refreshHistory,
    setActiveConversationId,
    setConversations,
    toast,
  ]);

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
  }, [activeConversationId, setConversations]);

  useEffect(() => {
    if (historyLoading || messages.length === 0) return;
    const highestRendered = Math.max(...messages.map((message) => message.sequence));
    readBatcher.current?.push(highestRendered);
  }, [historyLoading, messages]);

  useEffect(() => {
    const newlyExpired = messages.filter(
      (message) =>
        message.bounty?.status === 'expired' &&
        message.manifest.senderId === user.id &&
        !refreshedExpiredBounties.current.has(message.bounty.id),
    );
    if (newlyExpired.length === 0) return;
    newlyExpired.forEach((message) => refreshedExpiredBounties.current.add(message.bounty!.id));
    void refreshUser().catch(() => undefined);
  }, [messages, refreshUser, user.id]);

  useEffect(() => {
    if (!historyLoading && !loadingOlder) {
      messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [historyLoading, loadingOlder, messages.length, receivedBroadcasts.length]);

  async function loadOlderMessages() {
    if (!activeConversationId || !nextBeforeSequence || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messengerApi.messages(activeConversationId, {
        limit: 30,
        beforeSequence: nextBeforeSequence,
      });
      const decrypted = await decryptMessengerItems(page.items, keys, cache.current);
      setMessages((current) => mergeMessengerMessages(current, decrypted));
      setNextBeforeSequence(page.nextBeforeSequence);
      setHasMoreMessages(page.hasMore);
    } catch (cause) {
      setHistoryError(messengerError(cause));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function retryHistory() {
    if (!activeConversationId || historyLoading) return;
    setHistoryLoading(true);
    try {
      await refreshHistory(activeConversationId);
    } catch (cause) {
      setHistoryError(messengerError(cause));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function claimBounty(bounty: MessengerBounty) {
    if (claimingBountyId) return;
    setClaimingBountyId(bounty.id);
    try {
      const result = await messengerApi.claimBounty(bounty.id);
      setMessages((current) => applyClaimedBounty(current, result.bounty));
      invalidateData({ resource: 'conversations', conversationId: activeConversationId ?? undefined });
      if (result.bounty.status === 'claimed') {
        const beneficiary = messages.find((message) => message.bounty?.id === bounty.id)?.manifest.recipientId;
        if (beneficiary === user.id) {
          invalidateData({ resource: 'public-profile', username: user.username });
        }
      }
      await refreshUser().catch(() => undefined);
      toast(
        result.claimedNow ? 'Bounty claimed' : 'Bounty already claimed',
        'No real funds were moved.',
      );
    } catch (cause) {
      setHistoryError(messengerError(cause));
    } finally {
      setClaimingBountyId(null);
    }
  }

  const otherParticipant = context?.otherParticipant ?? activeConversation?.otherParticipant ?? null;
  const timelineItems = mergeMessengerTimeline(messages, receivedBroadcasts, otherParticipant?.id ?? null);
  const unreadMessageId = firstUnreadMessageId(messages, user.id, unreadMarker?.afterSequence ?? null);

  return {
    user,
    keys,
    ...conversationList,
    messages,
    historyLoading,
    historyError,
    hasMoreMessages,
    loadingOlder,
    ...composer,
    claimingBountyId,
    profileUsername,
    unreadMarker,
    broadcastRecipientDetails,
    messageEnd,
    otherParticipant,
    timelineItems,
    unreadMessageId,
    setProfileUsername,
    setBroadcastRecipientDetails,
    closeProfile,
    loadOlderMessages,
    retryHistory,
    claimBounty,
  };
}

export type MessengerWorkspaceState = ReturnType<typeof useMessengerWorkspace>;
