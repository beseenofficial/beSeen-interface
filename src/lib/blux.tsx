"use client";

import {
  BluxProvider,
  networks,
  useBlux,
} from "@bluxcc/react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  authApi,
  clearSession,
  profileApi,
  restoreSession,
} from "@/lib/api";
import { deriveAndSaveKeys, forgetKeys, loadKeys } from "@/lib/keys";
import { useActivityHeartbeat } from "@/lib/use-activity-heartbeat";
import type { AuthConfig, DerivedKeys, User } from "@/types";
import { useAuthStartup } from "@/providers/auth-startup";

export type AuthStatus =
  | "loading"
  | "signed-out"
  | "sign-required"
  | "needs-username"
  | "ready";

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
  logo: "/brand/beSeenLogoType.png",
  background: "#FFFFFF",
  fieldBackground: "#F7FAFB",
  accentColor: "#1045F5",
  textColor: "#0B0B3F",
  fontFamily: "Outfit, sans-serif",
  borderRadius: "16px",
  borderColor: "#D7E5EA",
  borderWidth: "1px",
};

function wipeKeys(keys: DerivedKeys): void {
  keys.signingPublicKey.fill(0);
  keys.signingPrivateKey.fill(0);
  keys.encryptionPublicKey.fill(0);
  keys.encryptionPrivateKey.fill(0);
}

const BLUX_RECENT_LOGIN = "__BLUX__RECENT_LOGIN_CONFIG";
const BLUX_RESTORE_TIMEOUT_MS = 8_000;

function hasRecentBluxLogin(): boolean {
  try {
    const raw = window.localStorage.getItem(BLUX_RECENT_LOGIN);
    if (!raw) return false;
    const record = JSON.parse(raw) as {
      authMethod?: unknown;
      timestamp?: unknown;
      jwt?: unknown;
    };
    if (
      typeof record.authMethod !== "string" ||
      typeof record.timestamp !== "number"
    ) {
      return false;
    }

    // These are the persistence windows used by Blux 0.2.x itself.
    const usesJwt =
      record.authMethod !== "wallet" &&
      typeof record.jwt === "string" &&
      !!record.jwt;
    const maxAge = usesJwt ? 21_600_000 : 2_400_000;
    return Date.now() - record.timestamp <= maxAge;
  } catch {
    return false;
  }
}

function useBluxRestoreSettled({
  address,
  apiSessionRestored,
  isAuthenticated,
  isReady,
}: {
  address: string | null;
  apiSessionRestored: boolean | null;
  isAuthenticated: boolean;
  isReady: boolean;
}): boolean {
  const [settled, setSettled] = useState(isAuthenticated && !!address);

  useEffect(() => {
    if (settled) return;
    if (isAuthenticated && address) {
      setSettled(true);
      return;
    }
    if (!isReady || apiSessionRestored === null) return;

    const restoreExpected = apiSessionRestored || hasRecentBluxLogin();
    if (!restoreExpected) {
      setSettled(true);
      return;
    }

    // Blux 0.2.x has no public "silent restore complete" signal. Keep the
    // startup barrier up while a previous session is expected, but always
    // provide a bounded escape hatch if the wallet/runtime cannot reconnect.
    const timeout = window.setTimeout(
      () => setSettled(true),
      BLUX_RESTORE_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [address, apiSessionRestored, isAuthenticated, isReady, settled]);

  return settled;
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
  const [apiSessionRestored, setApiSessionRestored] = useState<boolean | null>(
    null,
  );
  const [busyLabel, setBusyLabel] = useState<string | null>(
    "Restoring your secure session…",
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
  const bluxRestoreSettled = useBluxRestoreSettled({
    address,
    apiSessionRestored,
    isAuthenticated: blux.isAuthenticated,
    isReady: blux.isReady,
  });

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
        const restored = await restoreSession();
        if (active) setApiSessionRestored(restored);
        if (restored && active) {
          const restoredUser = await profileApi.me();
          if (active) {
            setUser(restoredUser);
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
            : "Wallet connection was not completed.",
        );
      }
      return;
    }
    inFlight.current = true;
    setError(null);
    let derived: DerivedKeys | null = null;
    try {
      setBusyLabel("Unlocking your BeSeen keys…");
      derived = await loadKeys(address, config);
      if (!derived) {
        setBusyLabel(
          "Approve the signature request to derive your BeSeen signing keypair…",
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

      setBusyLabel("Verifying your restored BeSeen identity…");
      const readyKeys = derived;
      try {
        const authenticated = await authApi.login(address, readyKeys);
        setKeysForAddress({ address, keys: readyKeys });
        derived = null;
        setUser(authenticated);
        setNeedsRegistration(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.code === "ACCOUNT_UNAVAILABLE") {
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
      setError(
        cause instanceof Error
          ? cause.message
          : "Secure sign-in could not be completed.",
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
          : "Wallet connection was not completed.",
      );
      throw cause;
    }
  }, [blux]);

  useEffect(() => {
    if (
      initializing ||
      !bluxRestoreSettled ||
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
    bluxRestoreSettled,
    completeSignIn,
    initializing,
    keys,
    user,
  ]);

  const logout = useCallback(async () => {
    // Disable authenticated background work immediately, before the network logout settles.
    setUser(null);
    try {
      await authApi.logout();
    } catch {
      await clearSession();
    }
    blux.logout();
    setKeysForAddress((current) => {
      if (current) wipeKeys(current.keys);
      return null;
    });
    setNeedsRegistration(false);
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
    bluxRestoreSettled &&
    blux.isReady &&
    blux.isAuthenticated &&
    !!address &&
    !keys &&
    autoAttemptedAddress !== address;
  const status: AuthStatus =
    initializing ||
    !bluxRestoreSettled ||
    !blux.isReady ||
    busyLabel ||
    awaitingAutomaticKeyRestore
      ? "loading"
      : !blux.isAuthenticated || !address
        ? "signed-out"
        : user && keys
          ? "ready"
          : needsRegistration && keys
            ? "needs-username"
            : "sign-required";

  useActivityHeartbeat(status === "ready" && user !== null);

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

function pathAcceptsStatus(pathname: string, status: AuthStatus): boolean {
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isDashboard = pathname.startsWith("/dashboard");

  if (pathname === "/") return false;
  if (!isLogin && !isOnboarding && !isDashboard) return true;
  if (status === "loading") return false;
  if (isLogin) {
    return status === "signed-out" || status === "sign-required";
  }
  if (isOnboarding) return status === "needs-username";
  return status === "ready";
}

function AuthStartupResolver() {
  const pathname = usePathname();
  const { status } = useAuth();
  const { complete } = useAuthStartup();

  useEffect(() => {
    if (pathAcceptsStatus(pathname, status)) complete();
  }, [complete, pathname, status]);

  return null;
}

export function BeSeenAuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { complete } = useAuthStartup();

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
              : "Authentication configuration is unavailable.",
          );
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (error) complete();
  }, [complete, error]);

  if (!process.env.NEXT_PUBLIC_BLUX_APP_ID) {
    throw new Error("NEXT_PUBLIC_BLUX_APP_ID is required (see .env.example).");
  }
  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center text-error">
        {error}
      </main>
    );
  }
  if (!config) {
    return null;
  }

  const selectedNetwork = networks.testnet;
  return (
    <BluxProvider
      config={{
        appId: process.env.NEXT_PUBLIC_BLUX_APP_ID,
        appName: "BeSeen",
        showWalletUIs: false,
        networks: [selectedNetwork],
        defaultNetwork: selectedNetwork,
        loginMethods: ["passkey", "wallet", "email", "google"],
        appearance,
      }}
    >
      <AuthBridge config={config}>
        <AuthStartupResolver />
        {children}
      </AuthBridge>
    </BluxProvider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside BeSeenAuthProvider.");
  return context;
}
