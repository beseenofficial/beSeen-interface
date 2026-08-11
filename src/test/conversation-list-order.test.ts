import { describe, expect, it } from 'vitest';
import { sortConversationsByLatestMessage } from '@/components/messenger/use-conversation-list';
import type { MessengerConversation } from '@/types';

function conversation(
  id: string,
  lastMessageAt: string | null,
  createdAt = '2026-01-01T00:00:00.000Z',
): MessengerConversation {
  return {
    id,
    createdAt,
    lastMessageAt,
    lastMessage: null,
    otherParticipant: {
      id: `${id}-participant`,
      username: id,
      avatar: null,
    },
    readState: {
      viewerReadSequence: 0,
      otherParticipantReadSequence: 0,
    },
    unreadCount: 0,
  };
}

describe('conversation list order', () => {
  it('sorts only by latest message activity without mutating the source list', () => {
    const source = [
      conversation('older', '2026-08-11T08:00:00.000Z'),
      conversation('newest', '2026-08-11T10:00:00.000Z'),
      conversation('middle', '2026-08-11T09:00:00.000Z'),
    ];

    expect(sortConversationsByLatestMessage(source).map(({ id }) => id)).toEqual([
      'newest',
      'middle',
      'older',
    ]);
    expect(source.map(({ id }) => id)).toEqual(['older', 'newest', 'middle']);
  });

  it('keeps the existing order when activity timestamps are equal', () => {
    const sameTime = '2026-08-11T10:00:00.000Z';
    const source = [
      conversation('first', sameTime),
      conversation('selected-third', sameTime),
      conversation('last', sameTime),
    ];

    expect(sortConversationsByLatestMessage(source).map(({ id }) => id)).toEqual([
      'first',
      'selected-third',
      'last',
    ]);
  });
});
