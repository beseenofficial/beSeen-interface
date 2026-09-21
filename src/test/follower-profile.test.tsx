import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ username: 'alice' }) }));

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const BUYER_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SUBJECT_ADDRESS = 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6';
const CONTRACT_ADDRESS = 'CDYJKXW6QTWQYPT3JCWXDUBG5TL5ALDX7PT4ULKH5IBJKOFXJAEKU7V5';

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  followCounts: vi.fn(),
  findConversation: vi.fn(),
  loadPending: vi.fn(),
  registerAndConfirm: vi.fn(),
  writeContract: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code: string) { super(message); }
  },
}));
const auth = vi.hoisted(() => ({
  address: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR' as string | null,
  user: { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' } as {
    id: string; username: string; avatar: null; createdAt: string;
  } | null,
  config: { networkPassphrase: 'Test SDF Network ; September 2015' },
}));

vi.mock('@bluxcc/react', () => ({
  useWriteContract: () => ({ mutateAsync: mocks.writeContract }),
}));

vi.mock('@/lib/api', () => ({
  messengerApi: { findConversationWithUser: mocks.findConversation },
  profileApi: { public: mocks.profile, followCounts: mocks.followCounts },
  ApiError: mocks.ApiError,
}));
vi.mock('@/lib/aura-purchase-workflow', () => ({
  loadPendingAuraPurchase: mocks.loadPending,
  registerAndConfirmAuraPurchase: mocks.registerAndConfirm,
}));
vi.mock('@/lib/blux', () => ({
  useAuth: () => auth,
  WALLET_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

import PublicProfilePage from '@/app/u/[username]/page';

const publicProfile = {
  id: 'alice-id', username: 'alice', avatar: null, bio: 'Building private social tools',
  verification: { isVerified: true, grantedAt: '2026-01-01T00:00:00.000Z', expiresAt: null },
  walletAddress: SUBJECT_ADDRESS,
  auraPrice: '15000000',
  createdAt: '2026-01-01T00:00:00.000Z', broadcastCount: 3, sentMessageCount: 5,
  receivedMessageCount: 7, messageCount: 12, totalBountyReceivedUsdc: '35.5',
};

const confirmedRegistration = {
  state: 'confirmed' as const,
  result: {
    purchase: {
      id: 'purchase', tokenId: '7', buyerAddress: BUYER_ADDRESS, subjectAddress: SUBJECT_ADDRESS,
      transactionHash: 'a'.repeat(64), status: 'confirmed', createdAt: '2026-08-01T00:00:00.000Z', confirmedAt: '2026-08-01T00:00:01.000Z',
    },
    conversation: { id: 'conversation', created: true },
  },
};

const pendingRegistration = {
  state: 'pending' as const,
  result: { ...confirmedRegistration.result, conversation: null },
};

describe('public profile social counts and statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
    auth.user = { id: 'viewer', username: 'viewer', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' };
    auth.address = BUYER_ADDRESS;
    auth.config = { networkPassphrase: NETWORK_PASSPHRASE };
    mocks.profile.mockResolvedValue(publicProfile);
    mocks.followCounts.mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 });
    mocks.findConversation.mockResolvedValue(null);
    mocks.loadPending.mockResolvedValue(null);
    mocks.registerAndConfirm.mockResolvedValue(confirmedRegistration);
    mocks.writeContract.mockResolvedValue({
      hash: 'A'.repeat(64),
      returnValue: vi.fn().mockResolvedValue(7n),
    });
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
    expect(screen.getAllByText('USDC').length).toBeGreaterThan(0);
  });

  it('shows the exact Aura price formatted from base units', async () => {
    render(<PublicProfilePage />);
    expect(await screen.findByText('Aura price')).toBeInTheDocument();
    expect(screen.getByText('1.5 USDC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase Aura · 1.5 USDC' })).toBeEnabled();
  });

  it('blocks purchasing while the Aura price is unavailable and offers a retry', async () => {
    mocks.profile.mockResolvedValue({ ...publicProfile, auraPrice: null });
    render(<PublicProfilePage />);
    expect(await screen.findByText('Aura price temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aura price unavailable' })).toBeDisabled();
    mocks.profile.mockResolvedValue(publicProfile);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('1.5 USDC')).toBeInTheDocument();
  });

  it('purchases the Aura on-chain, registers it, and refetches authoritative counts', async () => {
    mocks.followCounts
      .mockResolvedValueOnce({ user: { id: 'alice-id', username: 'alice' }, followerCount: 4, followingCount: 2 })
      .mockResolvedValue({ user: { id: 'alice-id', username: 'alice' }, followerCount: 5, followingCount: 2 });
    render(<PublicProfilePage />);
    expect(await screen.findByText('4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /subscribe to broadcasts/i }));
    // The confirmation modal must be approved before the contract call fires.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Current Aura price:/)).toBeInTheDocument();
    expect(mocks.writeContract).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.writeContract).toHaveBeenCalledWith({
      call: {
        address: CONTRACT_ADDRESS,
        fn: 'buy_aura',
        args: [BUYER_ADDRESS, SUBJECT_ADDRESS],
      },
    });
    // The registration payload carries the contract token ID as a string and a lowercase hash.
    expect(mocks.registerAndConfirm).toHaveBeenCalledWith('alice', {
      tokenId: '7',
      buyerAddress: BUYER_ADDRESS,
      subjectAddress: SUBJECT_ADDRESS,
      transactionHash: 'a'.repeat(64),
    }, expect.objectContaining({ onPending: expect.any(Function) }));
    expect(mocks.followCounts).toHaveBeenCalledTimes(2);
  });

  it('keeps purchase progress inside the modal until the transaction finishes', async () => {
    let resolveTransaction!: (value: {
      hash: string;
      returnValue: () => Promise<bigint>;
    }) => void;
    mocks.writeContract.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTransaction = resolve;
        }),
    );
    render(<PublicProfilePage />);

    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Purchasing Aura');
    expect(dialog).toHaveTextContent('Approve the transaction in your wallet…');
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    resolveTransaction({
      hash: 'A'.repeat(64),
      returnValue: vi.fn().mockResolvedValue(7n),
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces a 202-parked registration with a manual retry that never re-submits the transaction', async () => {
    mocks.registerAndConfirm
      .mockResolvedValueOnce(pendingRegistration)
      .mockResolvedValueOnce(confirmedRegistration);
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    // A parked confirmation stays recoverable inside the purchase modal.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Finalizing purchase')).toBeInTheDocument();
    const retry = within(dialog).getByRole('button', { name: 'Retry' });
    await userEvent.click(retry);
    await waitFor(() => expect(mocks.registerAndConfirm).toHaveBeenCalledTimes(2));
    // Same payload both times; the wallet transaction ran exactly once.
    expect(mocks.registerAndConfirm.mock.calls[0][1]).toEqual(mocks.registerAndConfirm.mock.calls[1][1]);
    expect(mocks.writeContract).toHaveBeenCalledTimes(1);
  });

  it('resumes a parked registration after a reload without a new transaction', async () => {
    const stored = {
      subjectUsername: 'alice',
      payload: {
        tokenId: '7', buyerAddress: BUYER_ADDRESS, subjectAddress: SUBJECT_ADDRESS,
        transactionHash: 'a'.repeat(64),
      },
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    mocks.loadPending.mockResolvedValue(stored);
    render(<PublicProfilePage />);
    const resume = await screen.findByRole('button', { name: 'Finish confirming purchase' });
    await userEvent.click(resume);
    await waitFor(() =>
      expect(mocks.registerAndConfirm).toHaveBeenCalledWith('alice', stored.payload, expect.any(Object)),
    );
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it('treats a wallet rejection as a cancellation, not an error', async () => {
    mocks.writeContract.mockRejectedValueOnce(new Error('Wallet signature was rejected.'));
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mocks.writeContract).toHaveBeenCalled());
    expect(mocks.registerAndConfirm).not.toHaveBeenCalled();
    // A canceled purchase shows no error and re-arms the purchase action.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Purchase Aura · 1.5 USDC' })).toBeEnabled();
  });

  it('shows the error and keeps the registration unsent when the transaction fails on-chain', async () => {
    mocks.writeContract.mockRejectedValueOnce(new Error('Transaction failed on the Stellar network.'));
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Transaction failed on the Stellar network.')).toBeInTheDocument();
    expect(mocks.registerAndConfirm).not.toHaveBeenCalled();
  });

  it('shows a concise USCC trustline error instead of the raw contract diagnostic', async () => {
    mocks.writeContract.mockRejectedValueOnce(new Error(
      'BLUX: Contract call failed (CCONTRACT.buy_aura): HostError: Error(Contract, #13) Event log: ["trustline entry is missing for account", "GBUYER"]',
    ));
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText(
      'Your wallet is missing the USCC trustline. Add it, then try again.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/Contract call failed/i)).not.toBeInTheDocument();
    expect(mocks.registerAndConfirm).not.toHaveBeenCalled();
  });

  it('blocks the purchase when the viewer wallet is the Aura subject', async () => {
    mocks.profile.mockResolvedValue({ ...publicProfile, walletAddress: BUYER_ADDRESS });
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('You cannot purchase your own Aura.')).toBeInTheDocument();
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.registerAndConfirm).not.toHaveBeenCalled();
  });

  it('blocks the purchase when the wallet is on the wrong Stellar network', async () => {
    auth.config = { networkPassphrase: 'Public Global Stellar Network ; September 2015' };
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(
      await screen.findByText('Your wallet is on a different Stellar network than this BeSeen deployment.'),
    ).toBeInTheDocument();
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it('cancelling the approval modal skips the purchase entirely', async () => {
    render(<PublicProfilePage />);
    await userEvent.click(await screen.findByRole('button', { name: /subscribe to broadcasts/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.registerAndConfirm).not.toHaveBeenCalled();
  });

  it('does not show a duplicate subscribe action to signed-out visitors', async () => {
    auth.user = null;
    render(<PublicProfilePage />);
    expect(await screen.findByRole('link', { name: /sign in to message/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subscribe to broadcasts/i })).not.toBeInTheDocument();
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
