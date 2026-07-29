import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '@/lib/blux';
import type { AuthConfig } from '@/types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const auth: AuthContextValue = {
  status: 'signed-out',
  busyLabel: null,
  address: null,
  keys: null,
  user: null,
  config: {} as AuthConfig,
  error: null,
  login: vi.fn(async () => {}),
  completeSignIn: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
  forgetPrivateKeys: vi.fn(async () => {}),
  setUser: vi.fn(),
  openWalletProfile: vi.fn(),
  fundWallet: vi.fn(),
};

vi.mock('@/lib/blux', () => ({
  useAuth: () => auth,
}));

import LoginPage from '@/app/(auth)/login/page';

beforeEach(() => {
  auth.status = 'signed-out';
  auth.busyLabel = null;
  auth.address = null;
  auth.error = null;
});

describe('login flow', () => {
  it('offers a Blux sign-in button when signed out', () => {
    render(<LoginPage />);
    expect(
      screen.getByRole('button', { name: /sign in with blux/i }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('asks for the ownership signature when it is still missing', () => {
    auth.status = 'sign-required';
    auth.address = 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6';
    render(<LoginPage />);
    expect(
      screen.getByRole('button', { name: /sign to continue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /use a different account/i }),
    ).toBeInTheDocument();
  });

  it('surfaces sign-in errors', () => {
    auth.status = 'sign-required';
    auth.error = 'The wallet signing request timed out. Please try again.';
    render(<LoginPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/timed out/i);
  });

  it('tells the user what is happening while keys are being created', () => {
    auth.status = 'loading';
    auth.busyLabel =
      'Creating your keypair — approve the signature request in your wallet';
    render(<LoginPage />);
    expect(screen.getByText(/creating your keypair/i)).toBeInTheDocument();
  });

  it('auto-advances signed-in users without an account to onboarding', () => {
    auth.status = 'needs-username';
    render(<LoginPage />);
    expect(replace).toHaveBeenCalledWith('/onboarding');
  });

  it('auto-advances registered users to the dashboard', () => {
    auth.status = 'ready';
    render(<LoginPage />);
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('waits while auth is loading instead of flashing the form', () => {
    auth.status = 'loading';
    render(<LoginPage />);
    expect(replace).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /sign in with blux/i }),
    ).toBeNull();
  });
});
