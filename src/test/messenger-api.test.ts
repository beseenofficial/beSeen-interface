import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ request: vi.fn(), requestWithStatus: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({
  apiRequest: transport.request,
  apiRequestWithStatus: transport.requestWithStatus,
}));

import {
  getMessengerBountySummary,
  getMessengerMessages,
  listMessengerConversations,
  markMessengerConversationRead,
} from '@/lib/api/messenger';
import * as messengerModule from '@/lib/api/messenger';

describe('Messenger API contract paths', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the conversation cursor unchanged through pagination', async () => {
    transport.request.mockResolvedValue({
      conversations: { items: [], nextCursor: null, hasMore: false },
    });
    await listMessengerConversations({ limit: 20, cursor: 'opaque+/= cursor' });
    expect(transport.request).toHaveBeenCalledWith(
      '/v1/messenger/conversations?limit=20&cursor=opaque%2B%2F%3D+cursor',
      { auth: true, signal: undefined },
    );
  });

  it('passes nextBeforeSequence unchanged through history pagination', async () => {
    transport.request.mockResolvedValue({ history: { items: [], nextBeforeSequence: null, hasMore: false } });
    await getMessengerMessages('507f1f77bcf86cd799439011', { limit: 30, beforeSequence: 42 });
    expect(transport.request).toHaveBeenCalledWith(
      '/v1/messenger/conversations/507f1f77bcf86cd799439011/messages?limit=30&beforeSequence=42',
      { auth: true, signal: undefined },
    );
  });

  it('batches read state in one documented request body', async () => {
    transport.request.mockResolvedValue({
      readState: { conversationId: '507f1f77bcf86cd799439011', readSequence: 9, unreadCount: 0 },
      updated: true,
    });
    await markMessengerConversationRead('507f1f77bcf86cd799439011', 9);
    expect(transport.request).toHaveBeenCalledWith(
      '/v1/messenger/conversations/507f1f77bcf86cd799439011/read',
      { method: 'PUT', auth: true, body: { throughSequence: 9 } },
    );
  });

  it('loads the authenticated available bounty summary', async () => {
    transport.request.mockResolvedValue({
      unclaimedCount: 3,
      updatedAt: '2026-09-19T12:00:00.000Z',
    });

    await expect(getMessengerBountySummary()).resolves.toEqual({
      unclaimedCount: 3,
      updatedAt: '2026-09-19T12:00:00.000Z',
    });
    expect(transport.request).toHaveBeenCalledWith('/v1/messenger/bounties/summary', {
      auth: true,
      signal: undefined,
    });
  });

  it('no longer exposes the removed manual claim endpoint', () => {
    // Bounties settle on-chain via the server verifier (settle_replies);
    // POST /v1/messenger/bounties/:id/claim does not exist anymore.
    expect(
      Object.keys(messengerModule).some((key) => /claim/i.test(key)),
    ).toBe(false);
  });
});
