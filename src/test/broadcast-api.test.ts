import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({
  apiRequest: transport.request,
}));

import { broadcastApi } from '@/lib/api/broadcasts';

describe('Broadcast API contract paths', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests only subsequent recipient pages with the opaque cursor and a limit of 50', async () => {
    transport.request.mockResolvedValue({
      recipients: { items: [], nextCursor: null, hasMore: false },
    });

    await broadcastApi.recipients('draft/id', 'opaque+/= cursor');

    expect(transport.request).toHaveBeenCalledWith(
      '/v1/broadcasts/drafts/draft%2Fid/recipients?limit=50&cursor=opaque%2B%2F%3D+cursor',
      { auth: true, signal: undefined },
    );
  });
});
