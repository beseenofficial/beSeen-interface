import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { DerivedKeys, User } from '@/types';

const WALLET = 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6';
const user: User = {
  id: 'user-id',
  username: 'alice',
  avatar: null,
  bio: null,
  verification: { isVerified: false, grantedAt: null, expiresAt: null },
  demoUsdcBalance: '20',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const keys: DerivedKeys = {
  signingPublicKey: new Uint8Array(32).fill(1),
  signingPrivateKey: new Uint8Array(64).fill(2),
  encryptionPublicKey: new Uint8Array(32).fill(3),
  encryptionPrivateKey: new Uint8Array(32).fill(4),
};

const mocks = vi.hoisted(() => ({
  blux: {
    isReady: true,
    isAuthenticated: true,
    user: {
      address: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
    } as { address: string } | undefined,
    login: vi.fn(),
    logout: vi.fn(),
    profile: vi.fn(),
    fundMe: vi.fn(),
    signTransaction: vi.fn(),
  },
  restoreSession: vi.fn(),
  profileMe: vi.fn(),
  authLogin: vi.fn(),
  recordActivity: vi.fn(),
  loadKeys: vi.fn(),
  deriveAndSaveKeys: vi.fn(),
}));

vi.mock('@bluxcc/react', () => ({
  BluxProvider: ({ children }: { children: ReactNode }) => children,
  networks: { testnet: 'testnet' },
  useBlux: () => mocks.blux,
}));

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  activityApi: { record: mocks.recordActivity },
  authApi: { login: mocks.authLogin, logout: vi.fn(), config: vi.fn() },
  clearSession: vi.fn(),
  hasAccessToken: vi.fn(() => false),
  profileApi: { me: mocks.profileMe },
  restoreSession: mocks.restoreSession,
  SESSION_CLEARED_EVENT: 'beseen:session-cleared',
}));

vi.mock('@/lib/keys', () => ({
  deriveAndSaveKeys: mocks.deriveAndSaveKeys,
  forgetKeys: vi.fn(),
  loadKeys: mocks.loadKeys,
}));

import { AuthBridge, useAuth } from '@/lib/blux';

function Probe() {
  const auth = useAuth();
  return (
    <>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="keys">{auth.keys ? 'unlocked' : 'locked'}</span>
      <span data-testid="error">{auth.error}</span>
    </>
  );
}

function renderBridge() {
  return render(
    <AuthBridge config={{} as never}>
      <Probe />
    </AuthBridge>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.blux.isReady = true;
  mocks.blux.isAuthenticated = true;
  mocks.blux.user = { address: WALLET };
  mocks.restoreSession.mockResolvedValue(true);
  mocks.profileMe.mockResolvedValue(user);
  mocks.authLogin.mockResolvedValue(user);
  mocks.loadKeys.mockResolvedValue(keys);
  mocks.deriveAndSaveKeys.mockResolvedValue(keys);
});

describe('auth key restoration', () => {
  it('never reports ready while key restoration is still pending', async () => {
    mocks.loadKeys.mockReturnValue(new Promise(() => {}));
    renderBridge();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loading');
    });
    expect(screen.getByTestId('keys')).toHaveTextContent('locked');
  });

  it('settles signed-out when neither the API nor Blux has a session', async () => {
    mocks.blux.isAuthenticated = false;
    mocks.blux.user = undefined;
    mocks.restoreSession.mockResolvedValue(false);
    renderBridge();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed-out'),
    );
    expect(mocks.profileMe).not.toHaveBeenCalled();
  });

  it('never exposes signed-out while a previous API session waits for Blux restore', async () => {
    mocks.blux.isAuthenticated = false;
    mocks.blux.user = undefined;
    const view = renderBridge();

    await waitFor(() => expect(mocks.profileMe).toHaveBeenCalledOnce());
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    mocks.blux.isAuthenticated = true;
    mocks.blux.user = { address: WALLET };
    view.rerender(
      <AuthBridge config={{} as never}>
        <Probe />
      </AuthBridge>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('ready'),
    );
  });

  it('restores a valid signed-message record after refresh without wallet interaction', async () => {
    renderBridge();

    await waitFor(() => expect(screen.getByTestId('keys')).toHaveTextContent('unlocked'));
    expect(mocks.loadKeys).toHaveBeenCalledWith(WALLET, expect.anything());
    expect(mocks.deriveAndSaveKeys).not.toHaveBeenCalled();
    expect(mocks.blux.signTransaction).not.toHaveBeenCalled();
    expect(mocks.authLogin).toHaveBeenCalledWith(WALLET, keys);
  });

  it('requests one wallet signature when no valid signed-message record exists', async () => {
    mocks.loadKeys.mockResolvedValue(null);
    renderBridge();

    await waitFor(() => expect(mocks.deriveAndSaveKeys).toHaveBeenCalledOnce());
    expect(mocks.deriveAndSaveKeys).toHaveBeenCalledWith(
      WALLET,
      expect.anything(),
      mocks.blux.signTransaction,
    );
    await waitFor(() => expect(screen.getByTestId('keys')).toHaveTextContent('unlocked'));
  });

  it('uses the verified login response instead of reading profile key fields', async () => {
    const refreshedUser = { ...user, username: 'refreshed-alice' };
    mocks.authLogin.mockResolvedValue(refreshedUser);
    renderBridge();

    await waitFor(() => expect(screen.getByTestId('keys')).toHaveTextContent('unlocked'));
    expect(mocks.authLogin).toHaveBeenCalledWith(WALLET, keys);
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
  });
});
