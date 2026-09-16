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
