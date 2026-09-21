// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  getAccountBoundJson: vi.fn(),
  setAccountBoundJson: vi.fn(),
}));

vi.mock('@/lib/secure-storage', () => storage);

import {
  loadBroadcastRecipients,
  saveBroadcastRecipients,
} from '@/lib/broadcast-recipient-storage';

beforeEach(() => {
  storage.getAccountBoundJson.mockResolvedValue(null);
  storage.setAccountBoundJson.mockResolvedValue(undefined);
});

describe('broadcast recipient storage', () => {
  it('stores and restores recipient details per account and broadcast', async () => {
    const recipients = [{ userId: 'recipient-1', username: 'alice' }];

    await saveBroadcastRecipients('creator-1', 'BROADCAST-1', recipients);
    expect(storage.setAccountBoundJson).toHaveBeenCalledWith(
      'broadcast-recipients:broadcast-1',
      'creator-1',
      recipients,
    );

    storage.getAccountBoundJson.mockResolvedValue(recipients);
    await expect(
      loadBroadcastRecipients('creator-1', 'BROADCAST-1'),
    ).resolves.toEqual(recipients);
  });

  it('preserves an empty recipient list and rejects malformed stored data', async () => {
    storage.getAccountBoundJson.mockResolvedValue([]);
    await expect(
      loadBroadcastRecipients('creator-1', 'broadcast-1'),
    ).resolves.toEqual([]);

    storage.getAccountBoundJson.mockResolvedValue([
      { userId: 'recipient-1' },
    ]);
    await expect(
      loadBroadcastRecipients('creator-1', 'broadcast-1'),
    ).resolves.toBeNull();
  });

  it('does not fail publishing when private storage is unavailable', async () => {
    storage.setAccountBoundJson.mockRejectedValue(new Error('blocked'));

    await expect(
      saveBroadcastRecipients('creator-1', 'broadcast-1', []),
    ).resolves.toBeUndefined();
  });
});
