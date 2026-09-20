import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  earnings: vi.fn(),
  followCounts: vi.fn(),
  currentProfile: vi.fn(),
  conversations: vi.fn(),
  messages: vi.fn(),
  bountySummary: vi.fn(),
  auth: {
    user: { id: 'alice', username: 'alice', avatar: null, auraPrice: '10000000' },
    keys: { signingPublicKey: new Uint8Array() },
    refreshUser: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  earningsApi: { list: mocks.earnings },
  messengerApi: {
    listConversations: mocks.conversations,
    messages: mocks.messages,
    bountySummary: mocks.bountySummary,
  },
  profileApi: { me: mocks.currentProfile, followCounts: mocks.followCounts },
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
vi.mock('@/lib/use-withdrawable-earnings', () => ({
  useWithdrawableEarnings: () => ({
    amount: '5',
    canWithdraw: true,
    error: false,
    hasUsdcTrustline: true,
    loading: false,
    ready: true,
    retry: vi.fn(),
    withdraw: vi.fn(),
    withdrawError: null,
    withdrawing: false,
  }),
}));
vi.mock('@/components/dashboard/recent-messages', () => ({ RecentMessages: () => null }));
vi.mock('@/components/dashboard/recent-broadcasts', () => ({ RecentBroadcasts: () => null }));

import OverviewPage from '@/app/(dashboard)/dashboard/page';

describe('dashboard earnings summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentProfile.mockResolvedValue({
      id: 'alice',
      username: 'alice',
      avatar: null,
      bio: 'Building on BeSeen.',
      auraPrice: '10000000',
      verification: { isVerified: false, grantedAt: null, expiresAt: null },
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.followCounts.mockResolvedValue({
      user: { id: 'alice', username: 'alice' },
      followerCount: 1_250,
      followingCount: 12,
    });
    mocks.conversations.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    mocks.messages.mockResolvedValue({ items: [], nextBeforeSequence: null, hasMore: false });
    mocks.bountySummary.mockResolvedValue({
      unclaimedCount: 0,
      updatedAt: '2026-09-19T12:00:00.000Z',
    });
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

    const card = (await screen.findByRole('heading', { name: 'Earnings' })).closest('article');
    expect(card).not.toBeNull();
    expect(within(card!).getByRole('link', { name: /View history/i })).toHaveAttribute('href', '/dashboard/earnings');
    expect(within(card!).getByText('9007199254740993.1234567 USDC')).toBeInTheDocument();
    const profileLink = screen.getByRole('link', { name: "View @alice's profile" });
    const discoverCard = profileLink.closest('article');
    expect(profileLink).toHaveAttribute('href', '/u/alice');
    expect(discoverCard).not.toBeNull();
    expect(within(discoverCard!).getByText('Aura holders')).toBeInTheDocument();
    expect(within(discoverCard!).getByText('Aura price')).toBeInTheDocument();
    expect(within(discoverCard!).getByText('USDC')).toBeInTheDocument();
    expect(within(discoverCard!).getByRole('link', { name: /Edit profile/i })).toHaveAttribute('href', '/dashboard/profile');
    expect(within(discoverCard!).getByRole('link', { name: /^Discover$/i })).toHaveAttribute('href', '/dashboard/discover');
  });

  it('shows unavailable instead of a false zero when earnings fail', async () => {
    mocks.earnings.mockRejectedValue(new Error('offline'));
    render(<OverviewPage />);

    const card = (await screen.findByRole('heading', { name: 'Earnings' })).closest('article');
    expect(card).not.toBeNull();
    await within(card!).findByText('Unavailable');
    expect(within(card!).queryByText('0 USDC')).not.toBeInTheDocument();
  });

  it('shows the number of incoming bounties that are not claimed or expired', async () => {
    mocks.earnings.mockResolvedValue({ totalAmount: '0', items: [], nextCursor: null, hasMore: false });
    mocks.bountySummary.mockResolvedValue({
      unclaimedCount: 2,
      updatedAt: '2026-09-19T12:00:00.000Z',
    });

    render(<OverviewPage />);
    const card = (await screen.findByRole('heading', { name: 'Available bounties' })).closest('article');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('2')).toBeInTheDocument();
    expect(within(card!).getByText('2 bounties are waiting to be claimed.')).toBeInTheDocument();
    expect(within(card!).queryByText('$0')).not.toBeInTheDocument();
    expect(mocks.bountySummary).toHaveBeenCalledOnce();
  });

  it('shows an unavailable state when the bounty summary cannot be loaded', async () => {
    mocks.earnings.mockResolvedValue({ totalAmount: '0', items: [], nextCursor: null, hasMore: false });
    mocks.bountySummary.mockRejectedValue(new Error('offline'));

    render(<OverviewPage />);
    const card = (await screen.findByRole('heading', { name: 'Available bounties' })).closest('article');
    expect(card).not.toBeNull();
    expect(await within(card!).findByText('We could not update your bounty status.')).toBeInTheDocument();
    expect(within(card!).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
