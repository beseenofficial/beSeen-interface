import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ username: 'alice' }) }));

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), followCounts: vi.fn(), profileToken: vi.fn(), mine: vi.fn(), purchase: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code: string) { super(message); }
  },
}));
const auth = vi.hoisted(() => ({
  user: { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' } as {
    id: string; username: string; avatar: null; createdAt: string;
  } | null,
}));

vi.mock('@/lib/api', () => ({
  messengerApi: { findConversationWithUser: vi.fn() },
  profileApi: { public: mocks.profile, followCounts: mocks.followCounts },
  tokenApi: { profileToken: mocks.profileToken, mine: mocks.mine, purchase: mocks.purchase },
  ApiError: mocks.ApiError,
}));
vi.mock('@/lib/blux', () => ({ useAuth: () => auth }));

import PublicProfilePage from '@/app/u/[username]/page';

const publicProfile = {
  id: 'alice-id', username: 'alice', avatar: null, bio: 'Building private social tools',
  verification: { isVerified: true, grantedAt: '2026-01-01T00:00:00.000Z', expiresAt: null },
  createdAt: '2026-01-01T00:00:00.000Z', broadcastCount: 3, sentMessageCount: 5,
  receivedMessageCount: 7, messageCount: 12, totalBountyReceivedUsdc: '35.5',
};

describe('public profile social counts and statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' };
    mocks.profile.mockResolvedValue(publicProfile);
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 });
    mocks.profileToken.mockResolvedValue({ id: 'token', owner: { id: 'alice-id', username: 'alice', avatar: null }, createdAt: '2026-01-01T00:00:00.000Z' });
    mocks.mine.mockResolvedValue([]);
  });

  it('renders the essential public profile stats without message-direction detail', async () => {
    render(<PublicProfilePage />);
    expect(await screen.findByText('Building private social tools')).toBeInTheDocument();
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('Sent messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Received messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Lifetime')).not.toBeInTheDocument();
    // The amount and its unit render as separate spans so every metric value shares one optical size.
    expect(screen.getByText('35.5')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
  });

  it('refetches authoritative counts after a token purchase', async () => {
    mocks.followCounts
      .mockResolvedValueOnce({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 })
      .mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 5, followingCount: 2 });
    mocks.purchase.mockResolvedValue({ created: true, holding: {}, conversation: { id: 'conversation', created: true } });
    render(<PublicProfilePage />);
    expect(await screen.findByText('4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /subscribe to broadcasts/i }));
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    expect(mocks.followCounts).toHaveBeenCalledTimes(2);
  });

  it('does not show a duplicate subscribe action to signed-out visitors', async () => {
    auth.user = null;
    render(<PublicProfilePage />);
    expect(await screen.findByRole('link', { name: /sign in to message/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /subscribe to broadcasts/i })).not.toBeInTheDocument();
  });

  it('keeps profile data visible and offers retry when follow counts fail', async () => {
    mocks.followCounts.mockRejectedValueOnce(new Error('offline'));
    render(<PublicProfilePage />);
    expect(await screen.findByText('@alice')).toBeInTheDocument();
    expect(await screen.findByText('Follow counts could not be loaded.')).toBeInTheDocument();
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
  });

  it('shows a retryable not-found state for USER_NOT_FOUND', async () => {
    mocks.profile.mockRejectedValueOnce(new mocks.ApiError('missing', 404, 'USER_NOT_FOUND'));
    render(<PublicProfilePage />);
    expect(await screen.findByText('This BeSeen profile does not exist.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
