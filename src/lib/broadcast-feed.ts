import { broadcastApi } from '@/lib/api';
import type { BroadcastFeedItem } from '@/types';

export async function loadCompleteBroadcastFeed(
  view: 'received' | 'sent',
): Promise<BroadcastFeedItem[]> {
  const items: BroadcastFeedItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await broadcastApi.feed(view, cursor);
    items.push(...page.items);
    if (!page.hasMore) break;
    if (!page.nextCursor) throw new Error('The feed cursor is missing.');
    cursor = page.nextCursor;
  } while (cursor);

  return items;
}
