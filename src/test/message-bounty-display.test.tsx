import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageBounty } from '@/components/messenger/message-bounty';
import type { MessengerBounty } from '@/types';

const baseBounty: MessengerBounty = {
  id: 'bounty',
  assetCode: 'USDC',
  amount: '25',
  durationSeconds: 86400,
  status: 'offered',
  expiresAt: '2026-09-01T00:00:00.000Z',
  replyMessageId: null,
  claimableAt: null,
  claimedAt: null,
};

describe('message bounty display', () => {
  it('renders the attached bounty state from the visual spec', () => {
    render(<MessageBounty bounty={baseBounty} beneficiary={false} claiming={false} onClaim={vi.fn()} />);
    expect(screen.getByText('Bounty')).toBeInTheDocument();
    expect(screen.getByText('25 USDC reward attached')).toBeInTheDocument();
    expect(screen.getByText('Time to reply')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });

  it.each([
    ['claimed', 'Claimed', 'Bounty earned'],
    ['expired', 'Refunded', 'Bounty returned'],
  ] as const)('renders the %s state', (status, heading, detail) => {
    render(<MessageBounty bounty={{ ...baseBounty, status }} beneficiary={false} claiming={false} onClaim={vi.fn()} />);
    expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
    expect(screen.getByText(detail)).toBeInTheDocument();
  });

  it('keeps the claim action functional', async () => {
    const onClaim = vi.fn();
    const bounty = { ...baseBounty, status: 'claimable' as const };
    render(<MessageBounty bounty={bounty} beneficiary claiming={false} onClaim={onClaim} />);
    await userEvent.click(screen.getByRole('button', { name: 'Claim bounty' }));
    expect(onClaim).toHaveBeenCalledWith(bounty);
  });
});
