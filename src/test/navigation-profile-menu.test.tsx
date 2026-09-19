import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fundWallet: vi.fn(),
  openWalletProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/lib/blux', () => ({
  useAuth: () => ({
    user: { username: 'alice', avatar: null },
    fundWallet: mocks.fundWallet,
    openWalletProfile: mocks.openWalletProfile,
  }),
}));

import { Navigation } from '@/components/layout/navigation';

describe('Navigation profile menu', () => {
  it('opens with focus on the first action and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<Navigation onLogout={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /alice.*profile & wallet/i });
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Profile and wallet actions' });
    expect(menu).toBeInTheDocument();
    const publicProfile = screen.getByRole('menuitem', { name: 'View public profile' });
    expect(publicProfile).toHaveAttribute('href', '/u/alice');
    await waitFor(() => expect(publicProfile).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('runs wallet actions and closes the menu', async () => {
    const user = userEvent.setup();
    render(<Navigation onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /alice.*profile & wallet/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Wallet profile' }));

    expect(mocks.openWalletProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
