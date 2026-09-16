import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { durationLabel, MessageBounty } from '@/components/messenger/message-bounty';
import type { MessengerBounty } from '@/types';

const baseBounty: MessengerBounty = {
  id: 'bounty',
  contractBountyId: '7',
  assetCode: 'USDC',
  amount: '25',
  durationSeconds: 86400,
  status: 'offered',
  settlementStatus: 'pending',
  settlementTransactionHash: null,
  expiresAt: '2026-09-01T00:00:00.000Z',
  replyMessageId: null,
  claimableAt: null,
  claimedAt: null,
};

describe('message bounty display', () => {
  it('renders an offered bounty as waiting for a reply', () => {
    render(<MessageBounty bounty={baseBounty} />);
    expect(screen.getByText('Reply reward')).toBeInTheDocument();
    expect(screen.getByText('25 USDC')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText(/By /)).toBeInTheDocument();
  });

  it.each([
    ['pending', 'Settlement pending'],
    ['processing', 'Settlement processing'],
  ] as const)('shows claimable + %s as an asynchronous settlement state', (settlementStatus, label) => {
    render(<MessageBounty bounty={{ ...baseBounty, status: 'claimable', settlementStatus }} />);
    expect(screen.getByText('Reply received')).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows claimed + confirmed as a confirmed on-chain settlement', () => {
    render(
      <MessageBounty
        bounty={{
          ...baseBounty,
          status: 'claimed',
          settlementStatus: 'confirmed',
          settlementTransactionHash: 'b'.repeat(64),
          claimableAt: '2026-08-31T00:00:00.000Z',
          claimedAt: '2026-08-31T01:00:00.000Z',
        }}
      />,
    );
    expect(screen.getByText('Claimed')).toBeInTheDocument();
    expect(screen.getByText('Settlement confirmed')).toBeInTheDocument();
  });

  it('shows a failed settlement without offering any manual action', () => {
    render(<MessageBounty bounty={{ ...baseBounty, status: 'claimable', settlementStatus: 'failed' }} />);
    expect(screen.getByText('Settlement failed')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an expired bounty as expired, not as a refunded demo balance', () => {
    render(<MessageBounty bounty={{ ...baseBounty, status: 'expired' }} />);
    expect(screen.getByText('Bounty expired')).toBeInTheDocument();
    expect(screen.getByText('Reply window ended')).toBeInTheDocument();
    expect(screen.getByText('Refund available on-chain')).toBeInTheDocument();
  });

  it('distinguishes a sender-reclaimed expired bounty as refunded on-chain', () => {
    render(
      <MessageBounty
        bounty={{ ...baseBounty, status: 'expired', fundingStatus: 'contract_refunded' }}
      />,
    );
    expect(screen.getByText('Refunded on-chain')).toBeInTheDocument();
    expect(screen.getByText('Back to sender')).toBeInTheDocument();
  });

  it('never renders a manual claim button in any state', () => {
    for (const status of ['offered', 'claimable', 'claimed', 'expired'] as const) {
      const { unmount } = render(<MessageBounty bounty={{ ...baseBounty, status }} />);
      expect(screen.queryByRole('button', { name: /claim/i })).toBeNull();
      unmount();
    }
  });

  it('does not round short reply windows into the wrong unit', () => {
    expect(durationLabel(30 * 60)).toBe('30 minutes');
    expect(durationLabel(90 * 60)).toBe('90 minutes');
    expect(durationLabel(4 * 86400)).toBe('4 days');
  });
});
