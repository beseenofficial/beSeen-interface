import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  earnings: vi.fn(),
  followCounts: vi.fn(),
  conversations: vi.fn(),
  messages: vi.fn(),
  auth: {
    user: { id: 'alice', username: 'alice', avatar: null, auraPrice: '10000000' },
    keys: { signingPublicKey: new Uint8Array() },
    refreshUser: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  earningsApi: { list: mocks.earnings },
  messengerApi: { listConversations: mocks.conversations, messages: mocks.messages },
  profileApi: { followCounts: mocks.followCounts },
}));
vi.mock('@/lib/broadcast-feed', () => ({
  BROADCAST_REFRESH_INTERVAL_MS: 60_000,
  loadCompleteBroadcastFeed: vi.fn().mockResolvedValue([]),
  mergeBroadcastFeeds: vi.fn(() => []),
}));
vi.mock('@/lib/broadcast-crypto', () => ({ decryptFeedItem: vi.fn() }));
vi.mock('@/lib/messenger-crypto', () => ({ decryptMessengerMessage: vi.fn() }));
vi.mock('@/lib/blux', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('@/providers/toast-provider', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/dashboard/recent-messages', () => ({ RecentMessages: () => null }));
vi.mock('@/components/dashboard/recent-broadcasts', () => ({ RecentBroadcasts: () => null }));

import OverviewPage from '@/app/(dashboard)/dashboard/page';

describe('dashboard earnings summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.followCounts.mockResolvedValue({ followerCount: 4, followingCount: 2 });
    mocks.conversations.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    mocks.messages.mockResolvedValue({ items: [], nextBeforeSequence: null, hasMore: false });
  });

  it('shows the API total exactly and links to earnings history', async () => {
    mocks.earnings.mockResolvedValue({
      assetCode: 'USDC',
      totalAmount: '9007199254740993.1234567',
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    render(<OverviewPage />);

    const card = await screen.findByRole('link', { name: /Total earned/i });
    expect(card).toHaveAttribute('href', '/dashboard/earnings');
    expect(within(card).getByText('9007199254740993.1234567 USDC')).toBeInTheDocument();
  });

  it('shows unavailable instead of a false zero when earnings fail', async () => {
    mocks.earnings.mockRejectedValue(new Error('offline'));
    render(<OverviewPage />);

    const card = await screen.findByRole('link', { name: /Total earned/i });
    await within(card).findByText('Earnings temporarily unavailable');
    expect(within(card).getByText('—')).toBeInTheDocument();
    expect(within(card).queryByText('0 USDC')).not.toBeInTheDocument();
  });

  it('shows the number of incoming bounties that are not claimed or expired', async () => {
    mocks.earnings.mockResolvedValue({ totalAmount: '0', items: [], nextCursor: null, hasMore: false });
    mocks.conversations.mockResolvedValue({
      items: [{
        id: 'conversation',
        otherParticipant: { id: 'bob', username: 'bob', avatar: null },
        unreadCount: 0,
        readState: { viewerReadSequence: 0, otherParticipantReadSequence: 0 },
        lastMessage: null,
        lastMessageAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      nextCursor: null,
      hasMore: false,
    });
    const message = (id: string, status: 'offered' | 'claimable' | 'claimed' | 'expired', recipientId = 'alice') => ({
      id: `message-${id}`,
      manifest: { recipientId },
      bounty: { id, status },
    });
    mocks.messages.mockResolvedValue({
      items: [
        message('available', 'offered'),
        message('settling', 'claimable'),
        message('claimed', 'claimed'),
        message('expired', 'expired'),
        message('outgoing', 'offered', 'bob'),
      ],
      nextBeforeSequence: null,
      hasMore: false,
    });

    render(<OverviewPage />);
    const card = (await screen.findByRole('heading', { name: 'Available bounties' })).closest('article');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('2')).toBeInTheDocument();
    expect(within(card!).getByText('2 bounties waiting to be claimed')).toBeInTheDocument();
    expect(within(card!).queryByText('$0')).not.toBeInTheDocument();
  });
});
