'use client';

import { createContext, useContext } from 'react';

export type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  address: string | null;
  login: () => Promise<void>;
  logout: () => void;
  signMessage: (message: string) => Promise<unknown>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside the Blux runtime');
  return context;
}
