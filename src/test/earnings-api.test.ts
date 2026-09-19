import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({ apiRequest: transport.request }));

import { earningsApi } from '@/lib/api/earnings';

describe('earnings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.request.mockResolvedValue({
      earnings: {
        assetCode: 'USDC',
        totalAmount: '5',
        items: [],
        nextCursor: null,
        hasMore: false,
      },
    });
  });

  it('preserves all event kinds and signed decimal strings from the response', async () => {
    const items = [
      {
        id: 'bounty', type: 'bounty_reply', reason: 'Bounty reply reward',
        contractBountyId: '42', contractAuraTokenId: null, assetCode: 'USDC', amount: '5',
        transactionHash: 'a'.repeat(64), earnedAt: '2026-09-16T12:00:00.000Z',
      },
      {
        id: 'aura', type: 'aura_purchase', reason: 'Aura purchase earning',
        contractBountyId: null, contractAuraTokenId: '77', assetCode: 'USDC', amount: '2.5',
        transactionHash: 'b'.repeat(64), earnedAt: '2026-09-16T11:00:00.000Z',
      },
      {
        id: 'withdrawal', type: 'withdrawal', reason: 'Earnings withdrawal',
        contractBountyId: null, contractAuraTokenId: null, assetCode: 'USDC', amount: '-1.25',
        transactionHash: 'c'.repeat(64), earnedAt: '2026-09-16T10:00:00.000Z',
      },
    ];
    transport.request.mockResolvedValue({
      earnings: { assetCode: 'USDC', totalAmount: '6.25', items, nextCursor: null, hasMore: false },
    });

    await expect(earningsApi.list()).resolves.toMatchObject({ totalAmount: '6.25', items });
  });

  it('requests the authenticated earnings page', async () => {
    await earningsApi.list();
    expect(transport.request).toHaveBeenCalledWith('/v1/users/me/earnings', {
      auth: true,
      signal: undefined,
    });
  });

  it('serializes limit and the opaque before cursor safely', async () => {
    const controller = new AbortController();
    await earningsApi.list(
      { limit: 25, before: 'opaque+/= cursor' },
      controller.signal,
    );
    expect(transport.request).toHaveBeenCalledWith(
      '/v1/users/me/earnings?limit=25&before=opaque%2B%2F%3D+cursor',
      { auth: true, signal: controller.signal },
    );
  });
});
