import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  earnings: vi.fn(),
  followCounts: vi.fn(),
  conversations: vi.fn(),
  auth: {
    user: { id: 'alice', username: 'alice', avatar: null, auraPrice: '10000000' },
    keys: { signingPublicKey: new Uint8Array() },
    refreshUser: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  earningsApi: { list: mocks.earnings },
  messengerApi: { listConversations: mocks.conversations },
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
});
