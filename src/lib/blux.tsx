'use client';

import { BluxProvider, networks, useBlux } from '@bluxcc/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, authApi, clearSession, profileApi, restoreSession } from '@/lib/api';
import { bytesToBase64 } from '@/lib/encoding';
import { deriveKeys, forgetKeys, loadKeys, saveKeys } from '@/lib/keys';
import type { AuthConfig, DerivedKeys, User } from '@/types';

export type AuthStatus =
  | 'loading'
  | 'signed-out'
  | 'sign-required'
  | 'needs-username'
  | 'ready';

export type AuthContextValue = {
  status: AuthStatus;
  busyLabel: string | null;
  address: string | null;
  keys: DerivedKeys | null;
  user: User | null;
  config: AuthConfig;
  error: string | null;
  login: () => Promise<void>;
  completeSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  forgetPrivateKeys: () => Promise<void>;
  setUser: (user: User) => void;
  openWalletProfile: () => void;
  fundWallet: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const appearance = {
  logo: '/brand/beSeenLogoType.png',
  background: '#FFFFFF',
  fieldBackground: '#F7FAFB',
  accentColor: '#1045F5',
  textColor: '#0B0B3F',
  fontFamily: 'Outfit, sans-serif',
  borderRadius: '16px',
  borderColor: '#D7E5EA',
  borderWidth: '1px',
};

function AuthBridge({ children, config }: { children: ReactNode; config: AuthConfig }) {
  const blux = useBlux();
  const address = blux.user?.address?.toUpperCase() ?? null;
  const [keysForAddress, setKeysForAddress] = useState<{
    address: string;
    keys: DerivedKeys;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [busyLabel, setBusyLabel] = useState<string | null>('Restoring your secure session…');
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const autoAttempted = useRef<string | null>(null);
  const keys = keysForAddress && keysForAddress.address === address ? keysForAddress.keys : null;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if ((await restoreSession()) && active) setUser(await profileApi.me());
      } finally {
        if (active) {
          setInitializing(false);
          setBusyLabel(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const completeSignIn = useCallback(async () => {
    if (inFlight.current) return;
    if (!address) {
      setError(null);
      try {
        await blux.login();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Wallet connection was not completed.');
      }
      return;
    }
    inFlight.current = true;
    setError(null);
    try {
      setBusyLabel('Unlocking your BeSeen keys…');
      let derived = await loadKeys(address, config);
      if (!derived) {
        setBusyLabel('Approve the fixed key-derivation transaction in your wallet…');
        derived = await deriveKeys(address, config, blux.signTransaction);
        await saveKeys(address, config, derived);
      }

      if (user) {
        const registered = await profileApi.keys(user.username);
        if (
          registered.signing.publicKey !== bytesToBase64(derived.signingPublicKey) ||
          registered.encryption.publicKey !== bytesToBase64(derived.encryptionPublicKey)
        ) {
          throw new Error('This wallet does not own the keys registered to the restored account.');
        }
        setKeysForAddress({ address, keys: derived });
        return;
      }

      setBusyLabel('Signing a fresh BeSeen login proof…');
      try {
        const authenticated = await authApi.login(address, derived);
        setKeysForAddress({ address, keys: derived });
        setUser(authenticated);
        setNeedsRegistration(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === 'ACCOUNT_UNAVAILABLE') {
          setKeysForAddress({ address, keys: derived });
          setNeedsRegistration(true);
          return;
        }
        throw cause;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Secure sign-in could not be completed.');
    } finally {
      inFlight.current = false;
      setBusyLabel(null);
    }
  }, [address, blux, config, user]);

  const login = useCallback(async () => {
    setError(null);
    try {
      await blux.login();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wallet connection was not completed.');
      throw cause;
    }
  }, [blux]);

  useEffect(() => {
    if (initializing || !blux.isReady || !blux.isAuthenticated || !address || keys) return;
    if (autoAttempted.current === address) return;
    autoAttempted.current = address;
    void completeSignIn();
  }, [address, blux.isAuthenticated, blux.isReady, completeSignIn, initializing, keys, user]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      await clearSession();
    }
    blux.logout();
    setUser(null);
    setKeysForAddress(null);
    setNeedsRegistration(false);
    setError(null);
    autoAttempted.current = null;
  }, [blux]);

  const forgetPrivateKeys = useCallback(async () => {
    if (address) await forgetKeys(address, config);
    setKeysForAddress(null);
  }, [address, config]);

  const status: AuthStatus = initializing || !blux.isReady || busyLabel
    ? 'loading'
    : user
      ? 'ready'
      : needsRegistration
        ? 'needs-username'
        : !blux.isAuthenticated || !address
          ? 'signed-out'
          : 'sign-required';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      busyLabel,
      address,
      keys,
      user,
      config,
      error,
      login,
      completeSignIn,
      logout,
      forgetPrivateKeys,
      setUser,
      openWalletProfile: () => blux.profile(),
      fundWallet: () => blux.fundMe(),
    }),
    [
      status,
      busyLabel,
      address,
      keys,
      user,
      config,
      error,
      login,
      completeSignIn,
      logout,
      forgetPrivateKeys,
      blux,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function BeSeenAuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    authApi.config(controller.signal).then(setConfig).catch((cause) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Authentication configuration is unavailable.');
      }
    });
    return () => controller.abort();
  }, []);

  if (!process.env.NEXT_PUBLIC_BLUX_APP_ID) {
    throw new Error('NEXT_PUBLIC_BLUX_APP_ID is required (see .env.example).');
  }
  if (error) {
    return <main className="grid min-h-screen place-items-center p-8 text-center text-error">{error}</main>;
  }
  if (!config) {
    return <main className="grid min-h-screen place-items-center text-secondary">Loading security settings…</main>;
  }

  const selectedNetwork = networks.testnet;
  return (
    <BluxProvider
      config={{
        appId: process.env.NEXT_PUBLIC_BLUX_APP_ID,
        appName: 'BeSeen',
        networks: [selectedNetwork],
        defaultNetwork: selectedNetwork,
        isPersistent: false,
        promptOnWrongNetwork: true,
        showWalletUIs: false,
        loginMethods: ['wallet', 'email', 'google'],
        appearance,
      }}
    >
      <AuthBridge config={config}>{children}</AuthBridge>
    </BluxProvider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside BeSeenAuthProvider.');
  return context;
}
