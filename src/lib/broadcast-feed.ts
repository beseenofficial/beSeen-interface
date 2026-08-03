import { broadcastApi } from '@/lib/api';
import type { BroadcastFeedItem } from '@/types';

export const BROADCAST_REFRESH_INTERVAL_MS = 10_000;

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

export function mergeBroadcastFeeds<
  T extends Pick<BroadcastFeedItem, 'id' | 'publishedAt'>,
>(...feeds: ReadonlyArray<ReadonlyArray<T>>): T[] {
  const uniqueItems = new Map<string, T>();

  for (const feed of feeds) {
    for (const item of feed) {
      if (!uniqueItems.has(item.id)) uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()].sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
}
