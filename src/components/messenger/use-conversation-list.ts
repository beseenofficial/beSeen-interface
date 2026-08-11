'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { LIST_POLL_MS, messengerError } from '@/components/messenger/messenger-view-utils';
import { messengerApi } from '@/lib/api';
import { startMessengerPolling } from '@/lib/messenger-polling';
import type { MessengerConversation } from '@/types';

function conversationActivityTime(conversation: MessengerConversation) {
  const timestamp = Date.parse(
    conversation.lastMessageAt ?? conversation.createdAt,
  );
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortConversationsByLatestMessage(
  conversations: MessengerConversation[],
) {
  return conversations
    .map((conversation, index) => ({ conversation, index }))
    .sort(
      (left, right) =>
        conversationActivityTime(right.conversation) -
          conversationActivityTime(left.conversation) ||
        left.index - right.index,
    )
    .map(({ conversation }) => conversation);
}

export function useConversationList() {
  const [conversations, setConversationState] = useState<MessengerConversation[]>([]);
  const setConversations = useCallback<
    Dispatch<SetStateAction<MessengerConversation[]>>
  >((update) => {
    setConversationState((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      return sortConversationsByLatestMessage(next);
    });
  }, []);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const updateConversationPage = useCallback(
    (page: Awaited<ReturnType<typeof messengerApi.listConversations>>) => {
      setConversations((current) => {
        const incomingIds = new Set(page.items.map((item) => item.id));
        return [...page.items, ...current.filter((item) => !incomingIds.has(item.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMoreConversations(page.hasMore);
    },
    [setConversations],
  );

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
    const poller = startMessengerPolling({
      task: refreshConversationList,
      intervalMs: LIST_POLL_MS,
    });
    return poller.stop;
  }, [listLoading, refreshConversationList]);

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

  const filteredConversations = conversations.filter((conversation) => {
    if (filter === 'unread' && conversation.unreadCount === 0) return false;
    return conversation.otherParticipant.username.toLowerCase().includes(search.trim().toLowerCase());
  });
  const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  return {
    conversations,
    listLoading,
    listError,
    hasMoreConversations,
    loadingMoreConversations,
    broadcastOpen,
    activeConversationId,
    search,
    filter,
    activeConversation,
    filteredConversations,
    totalUnread,
    setConversations,
    setBroadcastOpen,
    setActiveConversationId,
    setSearch,
    setFilter,
    refreshConversationList,
    loadMoreConversations,
  };
}
