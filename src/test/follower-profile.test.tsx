import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ username: 'alice' }) }));

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), followerCount: vi.fn(), profileToken: vi.fn(), mine: vi.fn(), purchase: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  user: { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' },
}));

vi.mock('@/lib/api', () => ({
  profileApi: { public: mocks.profile },
  tokenApi: {
    followerCount: mocks.followerCount,
    profileToken: mocks.profileToken,
    mine: mocks.mine,
    purchase: mocks.purchase,
  },
}));

vi.mock('@/lib/blux', () => ({
  useAuth: () => auth,
}));

import PublicProfilePage from '@/app/[username]/page';

describe('public follower count', () => {
  beforeEach(() => {
    mocks.profile.mockResolvedValue({ id: 'alice-id', username: 'alice', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' });
    mocks.followerCount.mockResolvedValue(4);
    mocks.profileToken.mockResolvedValue({ id: 'token', owner: { id: 'alice-id', username: 'alice', avatar: null }, createdAt: '2026-01-01T00:00:00.000Z' });
    mocks.mine.mockResolvedValue([]);
    mocks.purchase.mockReset();
  });

  it('increments after a newly created 201 holding', async () => {
    mocks.purchase.mockResolvedValue({ created: true, holding: {} });
    render(<PublicProfilePage />);
    expect(await screen.findByText('4 followers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /buy token/i }));
    await waitFor(() => expect(screen.getByText('5 followers')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Following' })).toBeDisabled();
  });

  it('does not increment when the idempotent purchase returns 200', async () => {
    mocks.purchase.mockResolvedValue({ created: false, holding: {} });
    render(<PublicProfilePage />);
    expect(await screen.findByText('4 followers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /buy token/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Following' })).toBeDisabled());
    expect(screen.getByText('4 followers')).toBeInTheDocument();
  });
});
