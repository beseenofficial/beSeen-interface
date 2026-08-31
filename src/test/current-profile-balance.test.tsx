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

describe('current profile demo balance', () => {
  beforeEach(() => {
    mocks.public.mockResolvedValue({ id: 'alice', username: 'alice', avatar: null, bio: null, verification: { isVerified: false, grantedAt: null, expiresAt: null }, createdAt: '2026-01-01T00:00:00.000Z', broadcastCount: 0, sentMessageCount: 0, receivedMessageCount: 0, messageCount: 0, totalBountyReceivedUsdc: '0' });
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice', username: 'alice' }, followerCount: 0, followingCount: 0 });
  });

  it('renders the exact decimal string as demo USDC', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('20.0000001 USDC')).toBeInTheDocument();
  });
});
