import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ public: vi.fn(), followCounts: vi.fn() }));
vi.mock('@/components/profile/own-profile-editor', () => ({ OwnProfileEditor: () => null }));
vi.mock('@/lib/api', () => ({ profileApi: { public: mocks.public, followCounts: mocks.followCounts } }));
vi.mock('@/lib/blux', () => ({ useAuth: () => ({
  keys: { signingPublicKey: new Uint8Array(), signingPrivateKey: new Uint8Array(), encryptionPublicKey: new Uint8Array(), encryptionPrivateKey: new Uint8Array() },
  user: { id: 'alice', username: 'alice', avatar: null, bio: null, verification: { isVerified: false, grantedAt: null, expiresAt: null }, demoUsdcBalance: '20.0000001', createdAt: '2026-01-01T00:00:00.000Z' },
}) }));

import ProfilePage from '@/app/(dashboard)/dashboard/profile/page';

describe('dashboard profile surface', () => {
  beforeEach(() => {
    mocks.public.mockResolvedValue({ id: 'alice', username: 'alice', avatar: null, bio: null, verification: { isVerified: false, grantedAt: null, expiresAt: null }, createdAt: '2026-01-01T00:00:00.000Z', broadcastCount: 3, sentMessageCount: 5, receivedMessageCount: 7, messageCount: 12, totalBountyReceivedUsdc: '35.5' });
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice', username: 'alice' }, followerCount: 4, followingCount: 2 });
  });

  it('renders the public profile directly without the old preview window', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Total messages')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('35.5')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.queryByText('Public profile preview')).not.toBeInTheDocument();
    expect(screen.queryByText('View full profile')).not.toBeInTheDocument();
    expect(screen.queryByText('USDC balance')).not.toBeInTheDocument();
  });
});
