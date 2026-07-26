"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_ADDRESS } from "@/lib/constants";

export type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  address: string | null;
  isDemo: boolean;
  login: () => Promise<void>;
  logout: () => void;
  signMessage: (message: string) => Promise<unknown>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const MOCK_SESSION_KEY = "beseen.mock.authenticated.v1";
const AUTH_OPERATION_TIMEOUT_MS = 30_000;

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

export function AuthProvider({ children }: { children: ReactNode }) {
  return <DemoAuthState>{children}</DemoAuthState>;
}

function DemoAuthState({ children }: { children: ReactNode }) {
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  useEffect(() => {
    try {
      setDemoAuthenticated(
        window.sessionStorage.getItem(MOCK_SESSION_KEY) === "true",
      );
    } finally {
      setDemoReady(true);
    }
  }, []);

  const login = useCallback(async () => {
    window.sessionStorage.setItem(MOCK_SESSION_KEY, "true");
    setDemoAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(MOCK_SESSION_KEY);
    setDemoAuthenticated(false);
  }, []);

  const signMessage = useCallback(async (message: string) => {
    const bytes = new TextEncoder().encode(`${message}\n${DEMO_ADDRESS}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: demoReady,
      isAuthenticated: demoAuthenticated,
      address: demoAuthenticated ? DEMO_ADDRESS : null,
      isDemo: true,
      login,
      logout,
      signMessage,
    }),
    [demoAuthenticated, demoReady, login, logout, signMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
