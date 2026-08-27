import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({ apiRequest: transport.request }));

import { recordUserActivity } from '@/lib/api/activity';

describe('user activity API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.request.mockResolvedValue({
      activity: {
        creditedSeconds: 60,
        lastActiveAt: '2026-08-27T12:00:00.000Z',
        isOnline: true,
      },
    });
  });

  it('posts an authenticated request without a body', async () => {
    const signal = new AbortController().signal;
    await expect(recordUserActivity(signal)).resolves.toMatchObject({ creditedSeconds: 60 });
    expect(transport.request).toHaveBeenCalledWith('/v1/users/me/activity', {
      method: 'POST',
      auth: true,
      signal,
    });
  });
});
