import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  readContracts: vi.fn(),
  balances: vi.fn(),
  writeContract: vi.fn(),
  refetchEarnings: vi.fn(),
  refetchBalances: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ earningsApi: { list: mocks.list } }));
vi.mock('@/lib/blux', () => ({
  useAuth: () => ({
    address: 'GOWNER',
    config: { networkPassphrase: 'Test SDF Network ; September 2015' },
  }),
}));
vi.mock('@/lib/bounty-contract', () => ({
  getBeSeenContractAddress: () => 'CCONTRACT',
}));
vi.mock('@/providers/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@bluxcc/react', () => ({
  useReadContracts: (...args: unknown[]) => mocks.readContracts(...args),
  useBalances: (...args: unknown[]) => mocks.balances(...args),
  useWriteContract: () => ({ mutateAsync: mocks.writeContract, isPending: false }),
}));

import EarningsPage from '@/app/(dashboard)/dashboard/earnings/page';

const transaction = {
  id: 'earning-1',
  type: 'bounty_reply' as const,
  reason: 'Bounty reply reward' as const,
  contractBountyId: '42',
  contractAuraTokenId: null,
  assetCode: 'USDC' as const,
  amount: '9007199254740993.1234567',
  transactionHash: 'a'.repeat(64),
  earnedAt: '2026-09-16T12:00:00.000Z',
};

const auraTransaction = {
  id: 'earning-2',
  type: 'aura_purchase' as const,
  reason: 'Aura purchase earning' as const,
  contractBountyId: null,
  contractAuraTokenId: '77',
  assetCode: 'USDC' as const,
  amount: '2.5',
  transactionHash: 'b'.repeat(64),
  earnedAt: '2026-09-16T11:00:00.000Z',
};

const withdrawalTransaction = {
  id: 'earning-3',
  type: 'withdrawal' as const,
  reason: 'Earnings withdrawal' as const,
  contractBountyId: null,
  contractAuraTokenId: null,
  assetCode: 'USDC' as const,
  amount: '-1.25',
  transactionHash: 'c'.repeat(64),
  earnedAt: '2026-09-16T10:00:00.000Z',
};

describe('Earnings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readContracts.mockReturnValue({
      data: { values: ['50000000'] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchEarnings,
    });
    mocks.balances.mockReturnValue({
      data: [
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          balance: '0.0000000',
        },
      ],
      isLoading: false,
      isError: false,
      refetch: mocks.refetchBalances,
    });
    mocks.refetchEarnings.mockResolvedValue(undefined);
    mocks.refetchBalances.mockResolvedValue(undefined);
    mocks.writeContract.mockResolvedValue({ hash: 'f'.repeat(64) });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders an empty history and the separate on-chain withdrawable balance', async () => {
    mocks.list.mockResolvedValue({
      assetCode: 'USDC', totalAmount: '0', items: [], nextCursor: null, hasMore: false,
    });
    render(<EarningsPage />);
    expect(await screen.findByText('No earnings yet')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('5 USDC')).toBeInTheDocument();
  });

  it('renders exact monetary strings and complete transaction evidence', async () => {
    mocks.list.mockResolvedValue({
      assetCode: 'USDC',
      totalAmount: '9007199254740994.3734567',
      items: [transaction, auraTransaction, withdrawalTransaction],
      nextCursor: null,
      hasMore: false,
    });
    render(<EarningsPage />);

    expect(await screen.findByText('+9007199254740993.1234567 USDC')).toBeInTheDocument();
    expect(screen.getByText('9007199254740994.3734567')).toBeInTheDocument();
    expect(screen.getByText('Bounty reply reward')).toBeInTheDocument();
    expect(screen.getByText('Contract bounty #42')).toBeInTheDocument();
    expect(screen.getByText('+2.5 USDC')).toBeInTheDocument();
    expect(screen.getByText('Aura purchase earning')).toBeInTheDocument();
    expect(screen.getByText('Aura token #77')).toBeInTheDocument();
    expect(screen.getByText('-1.25 USDC')).toBeInTheDocument();
    expect(screen.getByText('Earnings withdrawal')).toBeInTheDocument();
    expect(screen.queryByText('Contract bounty #null')).not.toBeInTheDocument();
    expect(screen.queryByText('Aura token #null')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Sep 16, 2026/i)).toHaveLength(3);
    expect(screen.getByText('aaaaaaaa…aaaaaaaa')).toBeInTheDocument();
    expect(screen.getAllByRole('time')[0]).toHaveAttribute('title', transaction.earnedAt);

    await userEvent.click(screen.getByRole('button', { name: `Copy transaction hash ${transaction.transactionHash}` }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(transaction.transactionHash);
  });

  it('appends pages without duplicating transaction IDs', async () => {
    mocks.list
      .mockResolvedValueOnce({
        assetCode: 'USDC', totalAmount: '7', items: [transaction], nextCursor: 'cursor-2', hasMore: true,
      })
      .mockResolvedValueOnce({
        assetCode: 'USDC',
        totalAmount: '7',
        items: [transaction, { ...transaction, id: 'earning-4', amount: '2', transactionHash: 'd'.repeat(64) }],
        nextCursor: null,
        hasMore: false,
      });

    render(<EarningsPage />);
    await screen.findByText('+9007199254740993.1234567 USDC');
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(screen.getByText('+2 USDC')).toBeInTheDocument());
    expect(screen.getAllByText('+9007199254740993.1234567 USDC')).toHaveLength(1);
    expect(mocks.list).toHaveBeenNthCalledWith(
      2,
      { limit: 25, before: 'cursor-2' },
      expect.any(AbortSignal),
    );
  });

  it('withdraws the exact contract balance without requesting trustline creation when it exists', async () => {
    mocks.list.mockResolvedValue({
      assetCode: 'USDC', totalAmount: '5', items: [], nextCursor: null, hasMore: false,
    });
    render(<EarningsPage />);
    await screen.findByText('Withdraw earnings');

    expect(mocks.readContracts).toHaveBeenCalledWith(
      [{ address: 'CCONTRACT', fn: 'earnings_balance', args: ['GOWNER'] }],
      { network: 'Test SDF Network ; September 2015' },
      { enabled: true },
    );
    expect(mocks.balances).toHaveBeenCalledWith(
      {
        address: 'GOWNER',
        includeZeroBalances: true,
        network: 'Test SDF Network ; September 2015',
      },
      { enabled: true },
    );

    const withdrawSection = screen.getByText('Withdraw earnings').closest('article');
    await userEvent.click(within(withdrawSection!).getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => expect(mocks.writeContract).toHaveBeenCalledTimes(1));
    expect(mocks.writeContract).toHaveBeenCalledWith({
      call: {
        address: 'CCONTRACT',
        fn: 'withdraw_earnings',
        args: ['GOWNER', '50000000', false],
      },
      options: { network: 'Test SDF Network ; September 2015' },
    });
    expect(mocks.refetchEarnings).toHaveBeenCalledTimes(1);
    expect(mocks.refetchBalances).toHaveBeenCalledTimes(1);
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Earnings withdrawn',
      expect.stringContaining('ffffffff…ffffffff'),
    );
  });

  it('asks the contract to create a trustline when the exact USDC trustline is missing', async () => {
    const exactRawAmount = '90071992547409931234567';
    mocks.readContracts.mockReturnValue({
      data: { values: [exactRawAmount] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchEarnings,
    });
    mocks.balances.mockReturnValue({
      data: [
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GDIFFERENTISSUER',
          balance: '12.0000000',
        },
      ],
      isLoading: false,
      isError: false,
      refetch: mocks.refetchBalances,
    });
    mocks.list.mockResolvedValue({
      assetCode: 'USDC', totalAmount: '5', items: [], nextCursor: null, hasMore: false,
    });

    render(<EarningsPage />);
    expect(await screen.findByText('9007199254740993.1234567 USDC')).toBeInTheDocument();
    expect(screen.getByText(/trustline will be created/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => expect(mocks.writeContract).toHaveBeenCalledTimes(1));
    expect(mocks.writeContract.mock.calls[0][0].call.args).toEqual([
      'GOWNER', exactRawAmount, true,
    ]);
  });

  it('disables withdrawal when the contract balance is zero', async () => {
    mocks.readContracts.mockReturnValue({
      data: { values: ['0'] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchEarnings,
    });
    mocks.list.mockResolvedValue({
      assetCode: 'USDC', totalAmount: '5', items: [], nextCursor: null, hasMore: false,
    });

    render(<EarningsPage />);
    await screen.findByText('Withdraw earnings');
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it('offers retry after an initial API failure', async () => {
    mocks.list
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        assetCode: 'USDC', totalAmount: '3', items: [], nextCursor: null, hasMore: false,
      });
    render(<EarningsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your earnings history");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('3')).toBeInTheDocument();
  });
});
