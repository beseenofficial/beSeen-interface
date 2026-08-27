import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({ apiRequest: transport.request }));

import { discoverUsers } from '@/lib/api/users';

describe('Discover users API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.request.mockResolvedValue({ users: [], nextCursor: null, hasMore: false });
  });

  it('uses the public endpoint with the default page size', async () => {
    await discoverUsers();

    expect(transport.request).toHaveBeenCalledWith('/v1/users/discover?limit=20', {
      signal: undefined,
    });
  });

  it('passes only the encoded cursor and limit for pagination', async () => {
    const signal = new AbortController().signal;
    await discoverUsers({ limit: 20, cursor: 'opaque+/= cursor' }, signal);

    expect(transport.request).toHaveBeenCalledWith(
      '/v1/users/discover?limit=20&cursor=opaque%2B%2F%3D+cursor',
      { signal },
    );
  });
});
