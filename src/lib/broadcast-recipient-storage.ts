import {
  getAccountBoundJson,
  setAccountBoundJson,
} from '@/lib/secure-storage';
import type { BroadcastRecipientSummary } from '@/types';

const recipientCollection = (broadcastId: string) =>
  `broadcast-recipients:${broadcastId.toLowerCase()}`;

function isRecipientSummary(value: unknown): value is BroadcastRecipientSummary {
  if (!value || typeof value !== 'object') return false;
  const recipient = value as Record<string, unknown>;
  return (
    typeof recipient.userId === 'string' &&
    typeof recipient.username === 'string'
  );
}

export async function saveBroadcastRecipients(
  userId: string,
  broadcastId: string,
  recipients: BroadcastRecipientSummary[],
): Promise<void> {
  try {
    await setAccountBoundJson(
      recipientCollection(broadcastId),
      userId,
      recipients,
    );
  } catch {
    // Private storage can be unavailable. The in-memory details still work.
  }
}

export async function loadBroadcastRecipients(
  userId: string,
  broadcastId: string,
): Promise<BroadcastRecipientSummary[] | null> {
  const stored = await getAccountBoundJson<unknown>(
    recipientCollection(broadcastId),
    userId,
  );
  return Array.isArray(stored) && stored.every(isRecipientSummary)
    ? stored
    : null;
}
