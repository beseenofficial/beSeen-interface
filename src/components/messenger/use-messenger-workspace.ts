'use client';

import { useWriteContract } from '@bluxcc/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  decryptMessengerItems,
  HISTORY_POLL_MS,
  messengerError,
} from '@/components/messenger/messenger-view-utils';
import { useConversationList } from '@/components/messenger/use-conversation-list';
import { useMessageComposer } from '@/components/messenger/use-message-composer';
import { ApiError, messengerApi, profileApi } from '@/lib/api';
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
  firstUnreadMessageId,
  mergeMessengerMessages,
  mergeMessengerTimeline,
} from '@/lib/messenger-state';
import { loadPendingMessengerAttempt } from '@/lib/messenger-workflow';
import { useAuth } from '@/lib/blux';
import { useToast } from '@/providers/toast-provider';
import {
  bountyDeadline,
  contractU64ToString,
  getBeSeenContractAddress,
  toBountyContractAmount,
} from '@/lib/bounty-contract';
import type {
  BroadcastRecipientSummary,
  DecryptedBroadcast,
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerConversationContext,
  User,
} from '@/types';

export function useMessengerWorkspace(user: User, keys: DerivedKeys) {
  const { toast } = useToast();
  const { address: senderAddress } = useAuth();
  const { mutateAsync: writeContract } = useWriteContract<bigint>();
  const conversationList = useConversationList();
  const {
    activeConversation,
    activeConversationId,
    broadcastOpen,
    refreshConversationList,
    setActiveConversationId,
    setConversations,
  } = conversationList;
  const [context, setContext] = useState<MessengerConversationContext | null>(
    null,
  );
  const [messages, setMessages] = useState<DecryptedMessengerMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextBeforeSequence, setNextBeforeSequence] = useState<number | null>(
    null,
  );
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [unreadMarker, setUnreadMarker] = useState<{
    afterSequence: number;
    count: number;
  } | null>(null);
  const [receivedBroadcasts, setReceivedBroadcasts] = useState<
    DecryptedBroadcast[]
  >([]);
  const [broadcastRecipientDetails, setBroadcastRecipientDetails] = useState<
    Record<string, BroadcastRecipientSummary[]>
  >({});
  const cache = useRef(new Map<string, DecryptedMessengerMessage>());
  const broadcastRefreshInFlight = useRef(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  const readBatcher = useRef<ReturnType<typeof createReadCursorBatcher> | null>(
    null,
  );

  const closeProfile = useCallback(() => setProfileUsername(null), []);

  const refreshReceivedBroadcasts = useCallback(async () => {
    if (broadcastRefreshInFlight.current) return;
    broadcastRefreshInFlight.current = true;
    try {
      const items = await loadCompleteBroadcastFeed('received');
      const decrypted = await Promise.all(
        items.map((item) => decryptFeedItem(item, keys)),
      );
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
      const decrypted = await decryptMessengerItems(
        page.items,
        keys,
        cache.current,
      );
      setMessages((current) => mergeMessengerMessages(current, decrypted));
      setHistoryError(null);
    },
    [keys],
  );

  // Locks the bounty on-chain with the sender's wallet and returns the
  // contract-generated global bounty ID as a decimal string. The ID must be
  // known before the message manifest is signed and sent to the API.
  const lockBounty = useCallback(
    async (bounty: {
      amount: string;
      durationSeconds: number;
    }): Promise<string> => {
      if (!senderAddress) {
        throw new Error('Connect your Stellar wallet before locking a bounty.');
      }

      // Do not use a context left over from the previously selected
      // conversation. The conversation list always identifies the intended
      // recipient, while the authenticated context may still be loading.
      const activeContext =
        context?.conversationId === activeConversationId ? context : null;
      const recipient =
        activeContext?.otherParticipant ??
        activeConversation?.otherParticipant ??
        null;
      if (!recipient) {
        throw new Error(
          'The bounty recipient is unavailable. Reopen the conversation and try again.',
        );
      }

      // Context is the cheapest source when it includes the settlement
      // address. Older API responses can omit it, so resolve the recipient's
      // canonical public profile instead of treating a missing context field
      // as a terminal error.
      let recipientAddress = activeContext?.otherParticipant.walletAddress?.trim();
      if (!recipientAddress) {
        const profile = await profileApi.public(recipient.username);
        if (profile.id !== recipient.id) {
          throw new Error('The bounty recipient profile no longer matches this conversation.');
        }
        recipientAddress = profile.walletAddress?.trim();
      }
      if (!recipientAddress) {
        throw new Error(
          'The recipient wallet address is unavailable. Ask them to reconnect their wallet and try again.',
        );
      }

      recipientAddress = recipientAddress.toUpperCase();
      const { StrKey } = await import('@stellar/stellar-sdk');
      if (!StrKey.isValidEd25519PublicKey(recipientAddress)) {
        throw new Error('The recipient wallet address is not a valid Stellar account.');
      }

      const transaction = await writeContract({
        call: {
          address: getBeSeenContractAddress(),
          fn: 'lock_bounty',
          args: [
            senderAddress,
            recipientAddress,
            toBountyContractAmount(bounty.amount),
            bountyDeadline(bounty.durationSeconds),
          ],
        },
      });

      return contractU64ToString(await transaction.returnValue());
    },
    [
      activeConversation,
      activeConversationId,
      context,
      senderAddress,
      writeContract,
    ],
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
    lockBounty,
    otherParticipantUsername:
      (context?.conversationId === activeConversationId
        ? context.otherParticipant.username
        : null) ??
      activeConversation?.otherParticipant.username ??
      null,
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
    setContext(null);
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
      messengerApi.messages(
        activeConversationId,
        { limit: 30 },
        controller.signal,
      ),
      loadPendingMessengerAttempt(activeConversationId),
    ])
      .then(async ([conversation, loadedContext, history, pending]) => {
        const decrypted = await decryptMessengerItems(
          history.items,
          keys,
          cache.current,
        );
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
            ? {
                afterSequence: conversation.readState.viewerReadSequence,
                count: conversation.unreadCount,
              }
            : null,
        );
        setMessages(
          decrypted.sort((left, right) => right.sequence - left.sequence),
        );
        setNextBeforeSequence(history.nextBeforeSequence);
        setHasMoreMessages(history.hasMore);
        setHasPendingRetry(Boolean(pending));
      })
      .catch((cause) => {
        if (!active || controller.signal.aborted) return;
        if (
          cause instanceof ApiError &&
          (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)
        ) {
          setConversations((current) =>
            current.filter((item) => item.id !== activeConversationId),
          );
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
          if (
            cause instanceof ApiError &&
            (cause.code === 'CONVERSATION_NOT_FOUND' || cause.status === 404)
          ) {
            setConversations((current) =>
              current.filter((item) => item.id !== activeConversationId),
            );
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
      const result = await messengerApi.markRead(
        activeConversationId,
        throughSequence,
      );
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
    const highestRendered = Math.max(
      ...messages.map((message) => message.sequence),
    );
    readBatcher.current?.push(highestRendered);
  }, [historyLoading, messages]);

  useEffect(() => {
    if (!historyLoading && !loadingOlder) {
      messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [
    historyLoading,
    loadingOlder,
    messages.length,
    receivedBroadcasts.length,
  ]);

  async function loadOlderMessages() {
    if (!activeConversationId || !nextBeforeSequence || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messengerApi.messages(activeConversationId, {
        limit: 30,
        beforeSequence: nextBeforeSequence,
      });
      const decrypted = await decryptMessengerItems(
        page.items,
        keys,
        cache.current,
      );
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

  const otherParticipant =
    (context?.conversationId === activeConversationId
      ? context.otherParticipant
      : null) ??
    activeConversation?.otherParticipant ??
    null;
  const timelineItems = mergeMessengerTimeline(
    messages,
    receivedBroadcasts,
    otherParticipant?.id ?? null,
  );
  const unreadMessageId = firstUnreadMessageId(
    messages,
    user.id,
    unreadMarker?.afterSequence ?? null,
  );

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
  };
}

export type MessengerWorkspaceState = ReturnType<typeof useMessengerWorkspace>;
