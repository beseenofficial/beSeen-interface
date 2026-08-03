// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mergeBroadcastFeeds } from '@/lib/broadcast-feed';

describe('mergeBroadcastFeeds', () => {
  it('combines received and sent broadcasts, removes duplicates, and sorts newest first', () => {
    const received = [
      { id: 'received-old', publishedAt: '2026-08-01T09:00:00.000Z' },
      { id: 'shared', publishedAt: '2026-08-02T09:00:00.000Z' },
    ];
    const sent = [
      { id: 'sent-new', publishedAt: '2026-08-03T09:00:00.000Z' },
      { id: 'shared', publishedAt: '2026-08-02T09:00:00.000Z' },
    ];

    expect(mergeBroadcastFeeds(received, sent).map((item) => item.id)).toEqual([
      'sent-new',
      'shared',
      'received-old',
    ]);
  });
});
