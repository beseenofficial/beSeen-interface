import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ discover: vi.fn() }));
vi.mock('@/lib/api', () => ({ usersApi: { discover: mocks.discover } }));

import DiscoverPage from '@/app/(dashboard)/dashboard/discover/page';

describe('Discover page', () => {
  beforeEach(() => vi.clearAllMocks());

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
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

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
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText("Couldn't load more people. Try again.")).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('@bob')).toBeInTheDocument());
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });
});
