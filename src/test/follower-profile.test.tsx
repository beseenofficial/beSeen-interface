import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ username: 'alice' }) }));

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), followCounts: vi.fn(), profileToken: vi.fn(), mine: vi.fn(), purchaseContext: vi.fn(), purchase: vi.fn(), writeContract: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code: string) { super(message); }
  },
}));
const auth = vi.hoisted(() => ({
  address: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR' as string | null,
  user: { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' } as {
    id: string; username: string; avatar: null; createdAt: string;
  } | null,
}));

vi.mock('@bluxcc/react', () => ({
  useWriteContract: () => ({ mutateAsync: mocks.writeContract }),
}));

vi.mock('@/lib/api', () => ({
  messengerApi: { findConversationWithUser: vi.fn() },
  profileApi: { public: mocks.profile, followCounts: mocks.followCounts },
  tokenApi: { profileToken: mocks.profileToken, mine: mocks.mine, purchaseContext: mocks.purchaseContext, purchase: mocks.purchase },
  ApiError: mocks.ApiError,
}));
vi.mock('@/lib/blux', () => ({ useAuth: () => auth }));

const horizonLoadAccount = vi.fn();
vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(() => ({ loadAccount: horizonLoadAccount })),
    },
  };
});

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
    process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS = 'CDYJKXW6QTWQYPT3JCWXDUBG5TL5ALDX7PT4ULKH5IBJKOFXJAEKU7V5';
    auth.user = { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' };
    auth.address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
    mocks.profile.mockResolvedValue(publicProfile);
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 });
    mocks.profileToken.mockResolvedValue({ id: 'token', owner: { id: 'alice-id', username: 'alice', avatar: null }, createdAt: '2026-01-01T00:00:00.000Z' });
    mocks.mine.mockResolvedValue([]);
    mocks.purchaseContext.mockResolvedValue({ subjectAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6' });
    mocks.writeContract.mockResolvedValue({ returnValue: vi.fn().mockResolvedValue(null) });
    horizonLoadAccount.mockResolvedValue({ id: auth.address });
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
    // The confirmation modal must be approved before the contract call fires.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mocks.writeContract).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    expect(mocks.writeContract).toHaveBeenCalledWith({
      call: {
        address: 'CDYJKXW6QTWQYPT3JCWXDUBG5TL5ALDX7PT4ULKH5IBJKOFXJAEKU7V5',
        fn: 'buy_aura',
        args: [
          'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
          'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
        ],
      },
    });
    expect(mocks.followCounts).toHaveBeenCalledTimes(2);
  });

  it('does not create an off-chain holding when the Aura transaction fails', async () => {
    mocks.writeContract.mockRejectedValueOnce(new Error('Wallet signature was rejected.'));
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Wallet signature was rejected.')).toBeInTheDocument();
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it('cancelling the approval modal skips the purchase entirely', async () => {
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it('blocks the purchase with a clear error when the wallet is unfunded', async () => {
    horizonLoadAccount.mockRejectedValueOnce(new Error('Account not found'));
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(
      await screen.findByText(
        'Your Stellar wallet is not funded yet. Fund it with XLM first, then try again.',
      ),
    ).toBeInTheDocument();
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.purchase).not.toHaveBeenCalled();
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
