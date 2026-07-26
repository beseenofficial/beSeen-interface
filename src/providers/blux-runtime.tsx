'use client';

import { BluxProvider, networks, useBlux } from '@bluxcc/react';
import {
  useCallback,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  AuthContext,
  withAuthTimeout,
  type AuthContextValue,
} from './auth-provider';
import {
  BLUX_LOGIN_METHODS,
  STELLAR_NETWORK,
  SUPPORTED_STELLAR_NETWORKS,
} from '@/lib/stellar-network';
import { ProfileProvider } from './profile-provider';
import { ToastProvider } from './toast-provider';

const appId = process.env.NEXT_PUBLIC_BLUX_APP_ID!;
const network = networks[STELLAR_NETWORK];
const supportedNetworks = SUPPORTED_STELLAR_NETWORKS.map(
  (networkName) => networks[networkName],
);
const bluxConfig = {
  appId,
  appName: 'BeSeen',
  networks: supportedNetworks,
  defaultNetwork: network,
  showWalletUIs: false,
  loginMethods: [...BLUX_LOGIN_METHODS],
  appearance: {
    background: '#FFFFFF',
    fieldBackground: '#F7FAFB',
    accentColor: '#1045F5',
    textColor: '#0B0B3F',
    fontFamily: 'Outfit, sans-serif',
    borderRadius: '16px',
    borderColor: '#D7E5EA',
    borderWidth: '1px',
  },
} satisfies ComponentProps<typeof BluxProvider>['config'];

function BluxAuthState({ children }: { children: ReactNode }) {
  const blux = useBlux();
  const {
    login: bluxLogin,
    logout: bluxLogout,
    signMessage: bluxSignMessage,
  } = blux;
  const login = useCallback(
    async () => withAuthTimeout(bluxLogin(), 'Sign in'),
    [bluxLogin],
  );
  const logout = useCallback(() => bluxLogout(), [bluxLogout]);
  const signMessage = useCallback(
    async (message: string) =>
      withAuthTimeout(bluxSignMessage(message), 'Message signing'),
    [bluxSignMessage],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: blux.isReady,
      isAuthenticated: blux.isAuthenticated,
      address: blux.user?.address || null,
      isDemo: false,
      login,
      logout,
      signMessage,
    }),
    [
      blux.isAuthenticated,
      blux.isReady,
      blux.user?.address,
      login,
      logout,
      signMessage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function BluxRuntime({ children }: { children: ReactNode }) {
  return (
    <BluxProvider config={bluxConfig}>
      <BluxAuthState>
        <ProfileProvider>
          <ToastProvider>{children}</ToastProvider>
        </ProfileProvider>
      </BluxAuthState>
    </BluxProvider>
  );
}
