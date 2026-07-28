"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, clearApiSession, loadApiSession, setApiSession } from "@/lib/api-client";
import { signSep10Challenge } from "@/lib/blux-signing";
import { beseenApi } from "@/lib/beseen-api";
import { assertBeSeenProtocol } from "@/lib/crypto/messaging-keys";
import type { AuthenticatedResult, User } from "@/types";

export type AccountState =
  | "loading"
  | "signed-out"
  | "provider-ready"
  | "unregistered"
  | "registered";

export type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  isProviderAuthenticated: boolean;
  needsRegistration: boolean;
  accountState: AccountState;
  address: string | null;
  user: User | null;
  error: string | null;
  login: () => Promise<AccountState>;
  logout: () => Promise<void>;
  signTransaction: (
    transactionXdr: string,
    networkPassphrase: string,
  ) => Promise<unknown>;
  completeRegistration: (result: AuthenticatedResult) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUser: (user: User) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_OPERATION_TIMEOUT_MS = 45_000;

export function withAuthTimeout<T>(
  operation: Promise<T>,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, AUTH_OPERATION_TIMEOUT_MS);
    operation.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        window.clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

type BackendAuthControllerInput = {
  providerReady: boolean;
  providerAuthenticated: boolean;
  providerAddress: string | null;
  providerLogin: () => Promise<{ address: string }>;
  providerLogout: () => void;
  signTransaction: (
    transactionXdr: string,
    networkPassphrase: string,
  ) => Promise<unknown>;
};

function readableAuthError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "INVALID_SEP10_CHALLENGE") {
      const attempts = cause.body.result.attemptsRemaining;
      return attempts === undefined
        ? "BeSeen couldn't verify this wallet approval. Please try signing in again."
        : `BeSeen couldn't verify this wallet approval. ${attempts} attempt${attempts === 1 ? "" : "s"} remaining.`;
    }
    if (cause.code === "CHALLENGE_EXPIRED") {
      return "The sign-in request expired. Please try again.";
    }
    if (cause.code === "ACCOUNT_UNAVAILABLE") {
      return "This wallet does not have an active BeSeen account.";
    }
    return cause.message;
  }
  return cause instanceof Error
    ? cause.message
    : "Secure sign-in could not be completed.";
}

export function useBackendAuthController({
  providerReady,
  providerAuthenticated,
  providerAddress,
  providerLogin,
  providerLogout,
  signTransaction,
}: BackendAuthControllerInput): AuthContextValue {
  const [accountState, setAccountState] = useState<AccountState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    if (!providerReady) {
      setAccountState("loading");
      return null;
    }
    if (!providerAuthenticated || !providerAddress) {
      setUser(null);
      setError(null);
      setAccountState("signed-out");
      return null;
    }

    setAccountState("loading");
    const session = await loadApiSession();
    if (!session) {
      setUser(null);
      setAccountState("provider-ready");
      return null;
    }

    try {
      const result = await beseenApi.getMe();
      if (
        result.user.walletAddress.toUpperCase() !==
        providerAddress.toUpperCase()
      ) {
        await clearApiSession();
        setUser(null);
        setAccountState("provider-ready");
        return null;
      }
      setUser(result.user);
      setError(null);
      setAccountState("registered");
      return result.user;
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        ["UNAUTHORIZED", "ACCOUNT_UNAVAILABLE", "REFRESH_TOKEN_INVALID"].includes(
          cause.code ?? "",
        )
      ) {
        await clearApiSession();
        setUser(null);
        setAccountState("provider-ready");
        return null;
      }
      setError(readableAuthError(cause));
      setAccountState("provider-ready");
      return null;
    }
  }, [providerAddress, providerAuthenticated, providerReady]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const sessionExpired = () => {
      setUser(null);
      setAccountState(providerAuthenticated ? "provider-ready" : "signed-out");
      setError("Your BeSeen session expired. Sign in again to continue.");
    };
    window.addEventListener("beseen:session-expired", sessionExpired);
    return () =>
      window.removeEventListener("beseen:session-expired", sessionExpired);
  }, [providerAuthenticated]);

  const login = useCallback(async (): Promise<AccountState> => {
    setError(null);
    setAccountState("loading");
    try {
      const providerUser =
        providerAuthenticated && providerAddress
          ? { address: providerAddress }
          : await withAuthTimeout(providerLogin(), "Sign in");
      const address = providerUser.address;
      const config = await beseenApi.getAuthConfig();
      assertBeSeenProtocol(config);

      let challenge;
      try {
        challenge = await beseenApi.createLoginChallenge(address);
      } catch (cause) {
        if (
          cause instanceof ApiError &&
          cause.code === "ACCOUNT_UNAVAILABLE"
        ) {
          setUser(null);
          setAccountState("unregistered");
          return "unregistered";
        }
        throw cause;
      }

      const signedTransactionXdr = await signSep10Challenge({
        walletAddress: address,
        challenge,
        config,
        signTransaction,
      });
      const authenticated = await beseenApi.login(
        challenge.challengeId,
        signedTransactionXdr,
      );
      await setApiSession(authenticated.auth);
      setUser(authenticated.user);
      setAccountState("registered");
      return "registered";
    } catch (cause) {
      setUser(null);
      setAccountState(
        providerAuthenticated ? "provider-ready" : "signed-out",
      );
      setError(readableAuthError(cause));
      throw cause;
    }
  }, [
    providerAddress,
    providerAuthenticated,
    providerLogin,
    signTransaction,
  ]);

  const completeRegistration = useCallback(
    async (result: AuthenticatedResult) => {
      await setApiSession(result.auth);
      setUser(result.user);
      setError(null);
      setAccountState("registered");
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (accountState !== "registered") return null;
    try {
      const result = await beseenApi.getMe();
      setUser(result.user);
      setError(null);
      return result.user;
    } catch (cause) {
      setError(readableAuthError(cause));
      throw cause;
    }
  }, [accountState]);

  const logout = useCallback(async () => {
    try {
      if (user) await beseenApi.logout();
    } catch {
      // Local cleanup must still happen if the session is already unavailable.
    }
    await clearApiSession();
    providerLogout();
    setUser(null);
    setError(null);
    setAccountState("signed-out");
  }, [providerLogout, user]);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    setError(null);
    setAccountState("registered");
  }, []);

  return useMemo(
    () => ({
      isReady: providerReady && accountState !== "loading",
      isAuthenticated: accountState === "registered" && user !== null,
      isProviderAuthenticated: providerAuthenticated,
      needsRegistration: accountState === "unregistered",
      accountState,
      address: providerAddress,
      user,
      error,
      login,
      logout,
      signTransaction,
      completeRegistration,
      refreshUser,
      updateUser,
    }),
    [
      accountState,
      completeRegistration,
      error,
      login,
      logout,
      providerAddress,
      providerAuthenticated,
      providerReady,
      refreshUser,
      signTransaction,
      updateUser,
      user,
    ],
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside the Blux provider");
  return context;
}
