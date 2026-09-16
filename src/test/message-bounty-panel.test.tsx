import { fireEvent, render, screen } from '@testing-library/react';
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
    bountyPanelOpen: true,
    otherParticipant: { username: 'sam' },
    showBounty: false,
    setBountyAmount: vi.fn(),
    setBountyDurationUnit: vi.fn(),
    setBountyDurationValue: vi.fn(),
    setBountyPanelOpen: vi.fn(),
    setShowBounty: vi.fn(),
    ...overrides,
  } as unknown as MessengerWorkspaceState;
}

describe('message bounty window', () => {
  it('does not show a validation error or any demo balance when opened', () => {
    render(<MessageBountyPanel workspace={workspace()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // No off-chain balance is displayed anywhere; funding is on-chain only.
    expect(screen.queryByText(/Available:/)).not.toBeInTheDocument();
    expect(screen.getByText('Locked on-chain from your connected wallet when you send.')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveAttribute('type', 'text');
    expect(document.querySelector('select')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reply time unit' })).toBeInTheDocument();
  });

  it('shows validation after attach is attempted with an invalid amount', async () => {
    render(<MessageBountyPanel workspace={workspace()} />);
    const amount = screen.getByLabelText('Amount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Attach 0 USDC' }));
    expect(screen.getByText('Enter a positive amount with up to 7 decimal places.')).toBeInTheDocument();
  });

  it('keeps edits local until the reward is updated', async () => {
    const setBountyAmount = vi.fn();
    const setBountyPanelOpen = vi.fn();
    render(<MessageBountyPanel workspace={workspace({ setBountyAmount, setBountyPanelOpen })} />);
    const amount = screen.getByLabelText('Amount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '12');
    await userEvent.click(screen.getByRole('button', { name: 'Close bounty settings' }));
    expect(setBountyAmount).not.toHaveBeenCalled();
    expect(setBountyPanelOpen).toHaveBeenCalledWith(false);
  });

  it('supports keyboard navigation in the custom time-unit select', async () => {
    const setBountyDurationUnit = vi.fn();
    render(<MessageBountyPanel workspace={workspace({ setBountyDurationUnit })} />);
    const trigger = screen.getByRole('button', { name: 'Reply time unit' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await screen.findByRole('option', { name: 'Hours' });
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('Days');
    expect(setBountyDurationUnit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Attach 10 USDC' }));
    expect(setBountyDurationUnit).toHaveBeenCalledWith('day');
  });

  it('can remove an already attached reward', async () => {
    const setShowBounty = vi.fn();
    render(<MessageBountyPanel workspace={workspace({ showBounty: true, setShowBounty })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove reward' }));
    expect(setShowBounty).toHaveBeenCalledWith(false);
  });
});
