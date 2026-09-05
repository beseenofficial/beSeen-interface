import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  refreshUser: vi.fn(),
  openWalletProfile: vi.fn(),
  fundWallet: vi.fn(),
};

const emailLogin = {
  sendCodeAsync: vi.fn(async () => undefined),
  loginWithCodeAsync: vi.fn(async () => ({})),
  reset: vi.fn(),
  error: null as Error | null,
  isCodeSent: false,
  isError: false,
  isIdle: true,
  isLoggingIn: false,
  isPending: false,
  isSendingCode: false,
  isSuccess: false,
  status: 'idle' as const,
};
const oauthLogin = {
  loginOAuthAsync: vi.fn(async () => ({})),
  reset: vi.fn(),
  error: null as Error | null,
  isPending: false,
};
const passkeyLogin = {
  loginPasskeyAsync: vi.fn(async () => ({})),
  reset: vi.fn(),
  error: null as Error | null,
  isPending: false,
};
const walletLogin = {
  loginWalletAsync: vi.fn(async () => ({})),
  reset: vi.fn(),
  error: null as Error | null,
  isPending: false,
};

vi.mock('@bluxcc/react', () => ({
  useLoginEmail: () => emailLogin,
  useLoginOAuth: () => oauthLogin,
  useLoginPasskey: () => passkeyLogin,
  useLoginWallet: () => walletLogin,
}));

vi.mock('@/lib/blux', () => ({
  useAuth: () => auth,
}));

import LoginPage from '@/app/(auth)/login/page';

beforeEach(() => {
  auth.status = 'signed-out';
  auth.busyLabel = null;
  auth.address = null;
  auth.error = null;
  emailLogin.error = null;
  emailLogin.isCodeSent = false;
  emailLogin.isLoggingIn = false;
  emailLogin.isPending = false;
  emailLogin.isSendingCode = false;
  oauthLogin.error = null;
  oauthLogin.isPending = false;
  passkeyLogin.error = null;
  passkeyLogin.isPending = false;
  walletLogin.error = null;
  walletLogin.isPending = false;
  vi.clearAllMocks();
});

describe('login flow', () => {
  it('keeps every sign-in method visible while preserving email and Google hierarchy', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /email me a code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^wallet$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^discord$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^github$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^passkey$/i })).toBeInTheDocument();
    expect(screen.queryByText(/sms/i)).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('starts social and wallet login directly from their buttons', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(oauthLogin.loginOAuthAsync).toHaveBeenCalledWith('google'));

    fireEvent.click(screen.getByRole('button', { name: /^wallet$/i }));
    await waitFor(() => expect(walletLogin.loginWalletAsync).toHaveBeenCalledWith());
  });

  it('starts the headless email flow from the primary form', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: ' hello@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
    await waitFor(() =>
      expect(emailLogin.sendCodeAsync).toHaveBeenCalledWith('hello@example.com'),
    );
    expect(screen.queryByText(/sms/i)).toBeNull();
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

  it('does not render Blux provider errors in the login panel', () => {
    auth.status = 'sign-required';
    auth.error = 'The wallet signing request timed out. Please try again.';
    render(<LoginPage />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/wallet signing request timed out/i)).toBeNull();
  });

  it('shows only local email validation and clears it as the user corrects the value', () => {
    render(<LoginPage />);
    const input = screen.getByLabelText(/email address/i);
    fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter your email address/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent(/complete email address/i);

    fireEvent.change(input, { target: { value: 'hello@example.com' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input).toHaveValue('hello@example.com');
    expect(emailLogin.sendCodeAsync).not.toHaveBeenCalled();
  });

  it('shows the contextual sign-in transition while keys are being created', () => {
    auth.status = 'loading';
    auth.busyLabel =
      'Creating your keypair — approve the signature request in your wallet';
    render(<LoginPage />);
    expect(screen.getByText(/creating your keypair/i)).toBeInTheDocument();
    expect(screen.queryByText(/no transaction is submitted to stellar/i)).toBeNull();
    expect(screen.queryByText(/derive your beseen signing keypair/i)).toBeNull();
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
      screen.queryByRole('button', { name: /sign in to beseen/i }),
    ).toBeNull();
  });
});
