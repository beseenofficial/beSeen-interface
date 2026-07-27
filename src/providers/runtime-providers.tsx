'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { LoadingState } from '@/components/ui/states';

const BluxRuntime = dynamic(() => import('./blux-runtime'), {
  ssr: false,
  loading: () => <LoadingState label="Preparing secure sign-in…" />,
});

export default function RuntimeProviders({
  children,
}: {
  children: ReactNode;
}) {
  return <BluxRuntime>{children}</BluxRuntime>;
}
