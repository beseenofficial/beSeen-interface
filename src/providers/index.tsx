'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { SecureLoadingScreen } from '@/components/ui/states';
import { ToastProvider } from './toast-provider';

// Blux talks to wallet extensions and IndexedDB, so it must never run on
// the server. All auth code lives in src/lib/blux.tsx.
const BeSeenAuthProvider = dynamic(
  () => import('@/lib/blux').then((mod) => mod.BeSeenAuthProvider),
  {
    ssr: false,
    loading: () => <SecureLoadingScreen label="Preparing secure sign-in…" />,
  },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BeSeenAuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </BeSeenAuthProvider>
  );
}
