'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { SecureLoadingScreen } from '@/components/ui/states';
import { useAuth, type AuthStatus } from '@/lib/blux';

type Mode = 'login' | 'onboarding' | 'app';

/** Where each auth status belongs. `null` = wait, don't navigate. */
const HOME: Record<AuthStatus, string | null> = {
  loading: null,
  'signed-out': '/login',
  'sign-required': '/login',
  'needs-username': '/onboarding',
  ready: '/dashboard',
};

const ALLOWED: Record<Mode, AuthStatus[]> = {
  login: ['signed-out', 'sign-required'],
  onboarding: ['needs-username'],
  app: ['ready'],
};

/**
 * Keeps every page on the right side of the auth flow: waits while auth is
 * loading, lets matching statuses through, and moves everyone else to where
 * they belong (this is what auto-advances users off /login once signed in).
 */
export function RouteGuard({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  const router = useRouter();
  const { status, busyLabel } = useAuth();
  const allowed = ALLOWED[mode].includes(status);
  const destination = allowed ? null : HOME[status];

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (!allowed) {
    // While signing in, tell the user what is actually happening (e.g.
    // "Creating your keypair — approve the signature request in your wallet")
    // instead of a silent generic spinner.
    return (
      <SecureLoadingScreen
        label={busyLabel ?? 'Preparing your BeSeen experience…'}
      />
    );
  }
  return children;
}
