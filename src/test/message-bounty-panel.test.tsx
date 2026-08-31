import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageBountyPanel } from '@/components/messenger/message-bounty-controls';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

function workspace(overrides: Record<string, unknown> = {}) {
  return {
    bountyAmount: '10',
    bountyAsset: 'USDC',
    bountyDurationUnit: 'hour',
    bountyDurationValue: '1',
    bountyError: 'Your demo USDC balance is not sufficient for this bounty.',
    bountyPanelOpen: true,
    demoUsdcBalance: '5',
    setBountyAmount: vi.fn(),
    setBountyDurationUnit: vi.fn(),
    setBountyDurationValue: vi.fn(),
    setBountyPanelOpen: vi.fn(),
    setShowBounty: vi.fn(),
    ...overrides,
  } as unknown as MessengerWorkspaceState;
}

describe('message bounty window', () => {
  it('does not show a balance error immediately when opened', () => {
    render(<MessageBountyPanel workspace={workspace()} />);
    expect(screen.queryByText('Your demo USDC balance is not sufficient for this bounty.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveAttribute('type', 'text');
    expect(document.querySelector('select')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reply time unit' })).toBeInTheDocument();
  });

  it('shows validation after attach is attempted', async () => {
    render(<MessageBountyPanel workspace={workspace()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Attach 10 USDC' }));
    expect(screen.getByText('Your demo USDC balance is not sufficient for this bounty.')).toBeInTheDocument();
  });
});
