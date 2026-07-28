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
  useBackendAuthController,
  type AuthContextValue,
} from './auth-provider';
import { BLUX_LOGIN_METHODS } from '@/lib/blux-signing';
import { ProfileProvider } from './profile-provider';
import { ToastProvider } from './toast-provider';

const appId = process.env.NEXT_PUBLIC_BLUX_APP_ID;
if (!appId) {
  throw new Error('NEXT_PUBLIC_BLUX_APP_ID is required.');
}

const bluxConfig = {
  appId,
  appName: 'BeSeen',
  networks: [networks.testnet],
  defaultNetwork: networks.testnet,
  isPersistent: true,
  promptOnWrongNetwork: true,
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

function BluxAuthBridge({ children }: { children: ReactNode }) {
  const blux = useBlux();
  const signTransaction = useCallback(
    (transactionXdr: string, networkPassphrase: string) =>
      blux.signTransaction(transactionXdr, { network: networkPassphrase }),
    [blux],
  );
  const controller = useBackendAuthController({
    providerReady: blux.isReady,
    providerAuthenticated: blux.isAuthenticated,
    providerAddress: blux.user?.address ?? null,
    providerLogin: blux.login,
    providerLogout: blux.logout,
    signTransaction,
  });
  const value = useMemo<AuthContextValue>(() => controller, [controller]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function BeSeenBluxProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BluxProvider config={bluxConfig}>
      <BluxAuthBridge>
        <ProfileProvider>
          <ToastProvider>{children}</ToastProvider>
        </ProfileProvider>
      </BluxAuthBridge>
    </BluxProvider>
  );
}
