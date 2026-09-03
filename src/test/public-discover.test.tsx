import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  discover: vi.fn(),
  publicProfile: vi.fn(),
  auth: { status: 'signed-out' },
}));

vi.mock('@/lib/api', () => ({
  profileApi: { public: mocks.publicProfile },
  usersApi: { discover: mocks.discover },
}));
vi.mock('@/lib/blux', () => ({ useAuth: () => mocks.auth }));

import PublicDiscoverPage from '@/app/discover/page';

describe('public Discover page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.status = 'signed-out';
    mocks.discover.mockResolvedValue({ users: [], nextCursor: null, hasMore: false });
  });

  it('shows public navigation and an auth action without private app navigation', async () => {
    render(<PublicDiscoverPage />);

    expect(screen.getByRole('link', { name: 'BeSeen Discover' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Join or sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Overview')).toBeNull();
    expect(screen.queryByText('Messenger')).toBeNull();
    expect(await screen.findByText('No people to discover yet')).toBeInTheDocument();
  });

  it('offers the dashboard instead of sign-in to an authenticated visitor', () => {
    mocks.auth.status = 'ready';
    render(<PublicDiscoverPage />);

    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Join or sign in' })).toBeNull();
  });
});
