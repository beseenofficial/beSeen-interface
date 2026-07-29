import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestWithStatus } = vi.hoisted(() => ({ requestWithStatus: vi.fn() }));
vi.mock('@/lib/api/transport', () => ({
  apiRequest: vi.fn(),
  apiRequestWithStatus: requestWithStatus,
}));

import { tokenApi } from '@/lib/api/tokens';

describe('token purchase status', () => {
  beforeEach(() => requestWithStatus.mockReset());

  it.each([
    [201, true],
    [200, false],
  ])('maps HTTP %s to created=%s', async (status, created) => {
    requestWithStatus.mockResolvedValue({
      status,
      result: {
        holding: {
          tokenId: 'token', ownerId: 'owner', ownerUsername: 'alice', acquiredAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    await expect(tokenApi.purchase('alice')).resolves.toMatchObject({ created });
    expect(requestWithStatus).toHaveBeenCalledWith('/v1/users/alice/token/purchase', {
      method: 'POST', auth: true,
    });
  });
});
