import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReadCursorBatcher, startMessengerPolling } from '@/lib/messenger-polling';
import { applyUnlockedBounty, firstUnreadMessageId, mergeMessengerTimeline } from '@/lib/messenger-state';
import type { DecryptedBroadcast, DecryptedMessengerMessage, MessengerBounty } from '@/types';

afterEach(() => {
  vi.useRealTimers();
});

describe('Messenger lifecycle helpers', () => {
  it('coalesces read cursors and never sends an older cursor', async () => {
    vi.useFakeTimers();
    const sent: number[] = [];
    const batcher = createReadCursorBatcher(async (sequence) => void sent.push(sequence), 20);
    batcher.push(1);
    batcher.push(3);
    batcher.push(2);
    await vi.advanceTimersByTimeAsync(20);
    expect(sent).toEqual([3]);
    batcher.push(2);
    await vi.advanceTimersByTimeAsync(30);
    expect(sent).toEqual([3]);
    batcher.push(7);
    await vi.advanceTimersByTimeAsync(20);
    expect(sent).toEqual([3, 7]);
    batcher.dispose();
  });

  it('stops polling timers and visibility listeners on cleanup', async () => {
    vi.useFakeTimers();
    let listener: (() => void) | null = null;
    const fakeDocument = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: vi.fn((_name: string, callback: EventListenerOrEventListenerObject) => {
        listener = callback as () => void;
      }),
      removeEventListener: vi.fn(),
    };
    const task = vi.fn(async () => undefined);
    const poller = startMessengerPolling({ task, intervalMs: 100, document: fakeDocument });
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);
    expect(listener).not.toBeNull();
    poller.stop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(task).toHaveBeenCalledTimes(1);
    expect(fakeDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('applies unlockedBounty immediately to the related displayed message', () => {
    const bounty: MessengerBounty = {
      id: '507f1f77bcf86cd799439099', contractBountyId: '9', assetCode: 'USDC', amount: '10', durationSeconds: 3600,
      status: 'claimable', settlementStatus: 'pending', settlementTransactionHash: null,
      expiresAt: '2026-08-11T12:00:00.000Z', replyMessageId: '507f1f77bcf86cd799439077',
      claimableAt: '2026-08-10T12:01:00.000Z', claimedAt: null,
    };
    const message = {
      id: 'message', bounty: { ...bounty, status: 'offered' },
    } as unknown as DecryptedMessengerMessage;
    expect(applyUnlockedBounty([message], bounty)[0].bounty?.status).toBe('claimable');
  });

  it('places received broadcasts from the participant into the direct timeline by time', () => {
    const message = { id: 'message', createdAt: '2026-08-10T12:02:00.000Z' } as DecryptedMessengerMessage;
    const matchingBroadcast = {
      id: 'broadcast', publishedAt: '2026-08-10T12:01:00.000Z', creator: { id: 'creator', username: 'creator', avatar: null },
    } as DecryptedBroadcast;
    const unrelatedBroadcast = {
      id: 'other-broadcast', publishedAt: '2026-08-10T12:00:00.000Z', creator: { id: 'other', username: 'other', avatar: null },
    } as DecryptedBroadcast;

    const timeline = mergeMessengerTimeline([message], [unrelatedBroadcast, matchingBroadcast], 'creator');
    expect(timeline.map((item) => item.kind === 'message' ? item.message.id : item.broadcast.id)).toEqual([
      'broadcast',
      'message',
    ]);
  });

  it('finds the first unread incoming message after the saved read sequence', () => {
    const message = (id: string, sequence: number, recipientId: string) => ({
      id,
      sequence,
      manifest: { recipientId },
    }) as DecryptedMessengerMessage;

    expect(firstUnreadMessageId([
      message('newer', 8, 'viewer'),
      message('outgoing', 6, 'other'),
      message('first-unread', 5, 'viewer'),
      message('read', 4, 'viewer'),
    ], 'viewer', 4)).toBe('first-unread');
  });
});
