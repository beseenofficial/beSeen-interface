import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, requestWithStatus } = vi.hoisted(() => ({
  request: vi.fn(),
  requestWithStatus: vi.fn(),
}));
vi.mock('@/lib/api/transport', () => ({
  apiRequest: request,
  apiRequestWithStatus: requestWithStatus,
}));

import { tokenApi } from '@/lib/api/tokens';

describe('token purchase status', () => {
  beforeEach(() => {
    request.mockReset();
    requestWithStatus.mockReset();
  });

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
        conversation: { id: '507f1f77bcf86cd799439011', created },
      },
    });
    await expect(tokenApi.purchase('alice')).resolves.toMatchObject({
      created,
      conversation: { id: '507f1f77bcf86cd799439011', created },
    });
    expect(requestWithStatus).toHaveBeenCalledWith('/v1/users/alice/token/purchase', {
      method: 'POST', auth: true,
    });
  });

  it('loads the authenticated on-chain purchase context', async () => {
    request.mockResolvedValueOnce({ subjectAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6' });
    await expect(tokenApi.purchaseContext('alice')).resolves.toEqual({
      subjectAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
    });
    expect(request).toHaveBeenCalledWith('/v1/users/alice/token/purchase-context', { auth: true });
  });
});
