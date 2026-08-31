import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ discover: vi.fn(), publicProfile: vi.fn() }));
vi.mock('@/lib/api', () => ({
  profileApi: { public: mocks.publicProfile },
  usersApi: { discover: mocks.discover },
}));

import DiscoverPage from '@/app/(dashboard)/dashboard/discover/page';

describe('Discover page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publicProfile.mockImplementation(async (username: string) => ({
      id: username,
      username,
      avatar: null,
      bio: `${username} creates thoughtful broadcasts.`,
      verification: { isVerified: false, grantedAt: null, expiresAt: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      broadcastCount: 12,
      sentMessageCount: 0,
      receivedMessageCount: 0,
      messageCount: 0,
      totalBountyReceivedUsdc: '25',
    }));
  });

  it('appends the next page without duplicating users', async () => {
    mocks.discover
      .mockResolvedValueOnce({
        users: [
          { id: 'a', username: 'alice', avatar: null, verification: { isVerified: true, grantedAt: null, expiresAt: null } },
          { id: 'b', username: 'bob', avatar: null, verification: { isVerified: false, grantedAt: null, expiresAt: null } },
        ],
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        users: [
          { id: 'b', username: 'bob', avatar: null },
          { id: 'c', username: 'carol', avatar: null },
        ],
        nextCursor: null,
        hasMore: false,
      });

    render(<DiscoverPage />);
    expect(await screen.findByText('@alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();
    expect(await screen.findByText('alice creates thoughtful broadcasts.')).toBeInTheDocument();
    expect(screen.getAllByText('25 USDC').length).toBeGreaterThan(0);

    expect(await screen.findByText('@carol')).toBeInTheDocument();
    expect(screen.getAllByText('@bob')).toHaveLength(1);
    expect(mocks.discover).toHaveBeenNthCalledWith(
      2,
      { limit: 20, cursor: 'cursor-2' },
      expect.any(AbortSignal),
    );
  });

  it('keeps loaded users visible when pagination fails and allows retry', async () => {
    mocks.discover
      .mockResolvedValueOnce({
        users: [{ id: 'a', username: 'alice', avatar: null }],
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        users: [{ id: 'b', username: 'bob', avatar: null }],
        nextCursor: null,
        hasMore: false,
      });

    render(<DiscoverPage />);
    expect(await screen.findByText('@alice')).toBeInTheDocument();

    expect(await screen.findByText("Couldn't load more people. Try again.")).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument());
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('searches loaded profiles and filters verified people', async () => {
    mocks.discover.mockResolvedValueOnce({
      users: [
        { id: 'a', username: 'alice', avatar: null, verification: { isVerified: true, grantedAt: null, expiresAt: null } },
        { id: 'b', username: 'bob', avatar: null, verification: { isVerified: false, grantedAt: null, expiresAt: null } },
      ],
      nextCursor: null,
      hasMore: false,
    });

    render(<DiscoverPage />);
    await screen.findByText('@alice');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search people' }), 'bob');
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.queryByText('@alice')).toBeNull();

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search people' }));
    await userEvent.click(screen.getByRole('button', { name: 'Verified' }));
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.queryByText('@bob')).toBeNull();
  });
});
