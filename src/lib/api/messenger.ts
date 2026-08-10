import { apiRequest, apiRequestWithStatus } from '@/lib/api/transport';
import type {
  MessengerBounty,
  MessengerConversation,
  MessengerConversationContext,
  MessengerConversationPage,
  MessengerMessageHistoryPage,
  MessengerReadReceipt,
  MessengerSendMessagePayload,
  MessengerSentMessage,
} from '@/types';

export type MessengerConversationQuery = {
  limit?: number;
  cursor?: string;
};

export type MessengerHistoryQuery = {
  limit?: number;
  beforeSequence?: number;
};

function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function messengerConversationListPath(query: MessengerConversationQuery = {}): string {
  return `/v1/messenger/conversations${queryString({
    limit: query.limit,
    cursor: query.cursor,
  })}`;
}

export function messengerHistoryPath(
  conversationId: string,
  query: MessengerHistoryQuery = {},
): string {
  return `/v1/messenger/conversations/${encodeURIComponent(conversationId)}/messages${queryString({
    limit: query.limit,
    beforeSequence: query.beforeSequence,
  })}`;
}

export async function listMessengerConversations(
  query: MessengerConversationQuery = {},
  signal?: AbortSignal,
): Promise<MessengerConversationPage> {
  return (
    await apiRequest<{ conversations: MessengerConversationPage }>(
      messengerConversationListPath(query),
      { auth: true, signal },
    )
  ).conversations;
}

export async function findMessengerConversationWithUser(
  userId: string,
  signal?: AbortSignal,
): Promise<MessengerConversation | null> {
  let cursor: string | undefined;
  do {
    const page = await listMessengerConversations({ limit: 50, cursor }, signal);
    const match = page.items.find((conversation) => conversation.otherParticipant.id === userId);
    if (match) return match;
    if (!page.hasMore || !page.nextCursor) return null;
    cursor = page.nextCursor;
  } while (cursor);
  return null;
}

export async function getMessengerConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<MessengerConversation> {
  return (
    await apiRequest<{ conversation: MessengerConversation }>(
      `/v1/messenger/conversations/${encodeURIComponent(conversationId)}`,
      { auth: true, signal },
    )
  ).conversation;
}

export async function getMessengerConversationContext(
  conversationId: string,
  signal?: AbortSignal,
): Promise<MessengerConversationContext> {
  return (
    await apiRequest<{ context: MessengerConversationContext }>(
      `/v1/messenger/conversations/${encodeURIComponent(conversationId)}/context`,
      { auth: true, signal },
    )
  ).context;
}

export async function getMessengerMessages(
  conversationId: string,
  query: MessengerHistoryQuery = {},
  signal?: AbortSignal,
): Promise<MessengerMessageHistoryPage> {
  return (
    await apiRequest<{ history: MessengerMessageHistoryPage }>(
      messengerHistoryPath(conversationId, query),
      { auth: true, signal },
    )
  ).history;
}

export async function sendMessengerMessage(
  conversationId: string,
  payload: MessengerSendMessagePayload,
): Promise<{ message: MessengerSentMessage; created: boolean }> {
  const { result, status } = await apiRequestWithStatus<{ message: MessengerSentMessage }>(
    `/v1/messenger/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', auth: true, body: payload },
  );
  return { message: result.message, created: status === 201 };
}

export async function markMessengerConversationRead(
  conversationId: string,
  throughSequence: number,
): Promise<{ readState: MessengerReadReceipt; updated: boolean }> {
  return apiRequest(
    `/v1/messenger/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'PUT', auth: true, body: { throughSequence } },
  );
}

export async function claimMessengerBounty(
  bountyId: string,
): Promise<{ bounty: MessengerBounty; claimedNow: boolean }> {
  return apiRequest(`/v1/messenger/bounties/${encodeURIComponent(bountyId)}/claim`, {
    method: 'POST',
    auth: true,
  });
}

export const messengerApi = {
  listConversations: listMessengerConversations,
  findConversationWithUser: findMessengerConversationWithUser,
  conversation: getMessengerConversation,
  context: getMessengerConversationContext,
  messages: getMessengerMessages,
  sendMessage: sendMessengerMessage,
  markRead: markMessengerConversationRead,
  claimBounty: claimMessengerBounty,
};
