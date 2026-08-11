'use client';

import { MessengerWorkspace } from '@/components/messenger/messenger-workspace';
import { SecureLoadingScreen } from '@/components/ui/states';
import { useAuth } from '@/lib/blux';

export function MessengerApp() {
  const { user, keys } = useAuth();
  if (!user || !keys) {
    return <SecureLoadingScreen label="Opening Messenger…" />;
  }
  return <MessengerWorkspace user={user} keys={keys} />;
}
