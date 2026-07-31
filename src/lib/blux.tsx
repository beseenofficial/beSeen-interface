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
import {
  ApiError,
  authApi,
  clearSession,
  profileApi,
  restoreSession,
} from '@/lib/api';
import { SecureLoadingScreen } from '@/components/ui/states';
import { deriveAndSaveKeys, forgetKeys, loadKeys } from '@/lib/keys';
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

function wipeKeys(keys: DerivedKeys): void {
  keys.signingPublicKey.fill(0);
  keys.signingPrivateKey.fill(0);
  keys.encryptionPublicKey.fill(0);
  keys.encryptionPrivateKey.fill(0);
}

export function AuthBridge({
  children,
  config,
}: {
  children: ReactNode;
  config: AuthConfig;
}) {
  const blux = useBlux();
  const address = blux.user?.address?.toUpperCase() ?? null;
  const [keysForAddress, setKeysForAddress] = useState<{
    address: string;
    keys: DerivedKeys;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [awaitingRestoredBluxSession, setAwaitingRestoredBluxSession] =
    useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(
    'Restoring your secure session…',
  );
  const [error, setError] = useState<string | null>(null);
  const [autoAttemptedAddress, setAutoAttemptedAddress] = useState<
    string | null
  >(null);
  const inFlight = useRef(false);
  const activeBluxIdentity = useRef({
    address,
    isAuthenticated: blux.isAuthenticated,
  });
  const keys =
    keysForAddress && keysForAddress.address === address
      ? keysForAddress.keys
      : null;

  useEffect(() => {
    activeBluxIdentity.current = {
      address,
      isAuthenticated: blux.isAuthenticated,
    };
    if (!blux.isAuthenticated) setAutoAttemptedAddress(null);
    setKeysForAddress((current) => {
      if (!current || (blux.isAuthenticated && current.address === address)) {
        return current;
      }
      wipeKeys(current.keys);
      return null;
    });
  }, [address, blux.isAuthenticated]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if ((await restoreSession()) && active) {
          const restoredUser = await profileApi.me();
          if (active) {
            setUser(restoredUser);
            // Blux marks itself ready before its persistent silent login has
            // necessarily finished. Keep the auth gate closed until that
            // matching wallet identity and its local keys are restored.
            setAwaitingRestoredBluxSession(true);
          }
        }
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
        setError(
          cause instanceof Error
            ? cause.message
            : 'Wallet connection was not completed.',
        );
      }
      return;
    }
    inFlight.current = true;
    setError(null);
    let derived: DerivedKeys | null = null;
    try {
      setBusyLabel('Unlocking your BeSeen keys…');
      derived = await loadKeys(address, config);
      if (!derived) {
        setBusyLabel(
          'Approve the fixed key-derivation transaction in your wallet…',
        );
        derived = await deriveAndSaveKeys(
          address,
          config,
          blux.signTransaction,
        );
      }

      if (
        !activeBluxIdentity.current.isAuthenticated ||
        activeBluxIdentity.current.address !== address
      ) {
        wipeKeys(derived);
        derived = null;
        return;
      }

      setBusyLabel('Verifying your restored BeSeen identity…');
      const readyKeys = derived;
      try {
        const authenticated = await authApi.login(address, readyKeys);
        setKeysForAddress({ address, keys: readyKeys });
        derived = null;
        setUser(authenticated);
        setNeedsRegistration(false);
        setAwaitingRestoredBluxSession(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === 'ACCOUNT_UNAVAILABLE') {
          setKeysForAddress({ address, keys: readyKeys });
          derived = null;
          setUser(null);
          setNeedsRegistration(true);
          return;
        }
        throw cause;
      }
    } catch (cause) {
      if (derived) wipeKeys(derived);
      setAwaitingRestoredBluxSession(false);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Secure sign-in could not be completed.',
      );
    } finally {
      inFlight.current = false;
      setBusyLabel(null);
      if (
        activeBluxIdentity.current.isAuthenticated &&
        activeBluxIdentity.current.address !== address
      ) {
        setAutoAttemptedAddress(null);
      }
    }
  }, [address, blux, config]);

  const login = useCallback(async () => {
    setError(null);
    try {
      await blux.login();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Wallet connection was not completed.',
      );
      throw cause;
    }
  }, [blux]);

  useEffect(() => {
    if (
      initializing ||
      !blux.isReady ||
      !blux.isAuthenticated ||
      !address ||
      keys
    )
      return;
    if (autoAttemptedAddress === address) return;
    setAutoAttemptedAddress(address);
    void completeSignIn();
  }, [
    address,
    autoAttemptedAddress,
    blux.isAuthenticated,
    blux.isReady,
    completeSignIn,
    initializing,
    keys,
    user,
  ]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      await clearSession();
    }
    blux.logout();
    setUser(null);
    setKeysForAddress((current) => {
      if (current) wipeKeys(current.keys);
      return null;
    });
    setNeedsRegistration(false);
    setAwaitingRestoredBluxSession(false);
    setError(null);
    setAutoAttemptedAddress(null);
  }, [blux]);

  const forgetPrivateKeys = useCallback(async () => {
    if (address) await forgetKeys(address, config);
    setKeysForAddress((current) => {
      if (current) wipeKeys(current.keys);
      return null;
    });
  }, [address, config]);

  const awaitingAutomaticKeyRestore =
    !initializing &&
    blux.isReady &&
    blux.isAuthenticated &&
    !!address &&
    !keys &&
    autoAttemptedAddress !== address;
  const restoredSessionStillHydrating = awaitingRestoredBluxSession && !keys;

  const status: AuthStatus =
    initializing ||
    !blux.isReady ||
    busyLabel ||
    awaitingAutomaticKeyRestore ||
    restoredSessionStillHydrating
      ? 'loading'
      : !blux.isAuthenticated || !address
        ? 'signed-out'
        : user && keys
          ? 'ready'
          : needsRegistration && keys
            ? 'needs-username'
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
    authApi
      .config(controller.signal)
      .then(setConfig)
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Authentication configuration is unavailable.',
          );
        }
      });
    return () => controller.abort();
  }, []);

  if (!process.env.NEXT_PUBLIC_BLUX_APP_ID) {
    throw new Error('NEXT_PUBLIC_BLUX_APP_ID is required (see .env.example).');
  }
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center text-error">
        {error}
      </main>
    );
  }
  if (!config) {
    return <SecureLoadingScreen label="Loading security settings…" />;
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
  if (!context)
    throw new Error('useAuth must be used inside BeSeenAuthProvider.');
  return context;
}
