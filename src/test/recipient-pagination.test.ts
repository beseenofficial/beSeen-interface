import { describe, expect, it, vi } from 'vitest';
import { broadcastApi } from '@/lib/api';
import { loadAllRecipients } from '@/lib/broadcast-workflow';
import type { BroadcastDraft, BroadcastRecipient } from '@/types';

vi.mock('@/lib/api', () => ({
  broadcastApi: {
    recipients: vi.fn(),
  },
}));

const recipient = (id: string): BroadcastRecipient => ({
  userId: id,
  username: id,
  keyVersion: 1,
  encryptionPublicKey: 'A'.repeat(43) + '=',
  keyUploaded: false,
  encryptedBroadcastKey: null,
});

describe('recipient pagination', () => {
  it('uses nextCursor only while hasMore is true', async () => {
    vi.mocked(broadcastApi.recipients).mockResolvedValue({
      items: [recipient('c')], nextCursor: null, hasMore: false,
    });
    const draft = {
      id: 'draft', audience: { type: 'token_holders', count: 3 },
      recipients: { items: [recipient('a'), recipient('b')], nextCursor: 'cursor-2', hasMore: true },
    } as BroadcastDraft;
    await expect(loadAllRecipients(draft)).resolves.toHaveLength(3);
    expect(broadcastApi.recipients).toHaveBeenCalledTimes(1);
    expect(broadcastApi.recipients).toHaveBeenCalledWith('draft', 'cursor-2');
  });
});
