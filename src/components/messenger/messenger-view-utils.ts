import { ApiError } from '@/lib/api';
import { decryptMessengerMessage } from '@/lib/messenger-crypto';
import type {
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerMessageHistoryItem,
} from '@/types';

export const LIST_POLL_MS = 15_000;
export const HISTORY_POLL_MS = 8_000;

export function messengerTimeLabel(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function messengerError(cause: unknown): string {
  if (!(cause instanceof ApiError)) {
    return cause instanceof Error
      ? cause.message
      : 'Messenger could not complete this request.';
  }
  if (cause.code === 'ACTIVE_KEYS_NOT_FOUND') {
    return 'Messaging is not ready for this account yet. Ask them to sign in once, then try again.';
  }
  if (cause.code === 'MESSAGE_ID_CONFLICT') {
    return 'This message could not be sent. Discard it, then write a new one.';
  }
  if (cause.code === 'BOUNTY_NOT_CLAIMABLE') {
    return 'This reward is not ready yet. The other person needs to reply before time runs out.';
  }
  if (cause.code === 'BOUNTY_EXPIRED' || cause.status === 410) {
    return 'This reward has expired.';
  }
  if (
    cause.code === 'RATE_LIMIT_EXCEEDED' ||
    cause.code === 'RATE_LIMITED' ||
    cause.status === 429
  ) {
    return 'Messenger is receiving too many requests. Wait a moment before retrying.';
  }
  if (cause.code === 'INVALID_MESSAGE_SIGNATURE') {
    return 'This message could not be sent. Please try again.';
  }
  if (cause.code === 'VALIDATION_ERROR') {
    return 'Check your message and reward details, then try again.';
  }
  return cause.message;
}

export async function decryptMessengerItems(
  items: MessengerMessageHistoryItem[],
  keys: DerivedKeys,
  cache: Map<string, DecryptedMessengerMessage>,
): Promise<DecryptedMessengerMessage[]> {
  return Promise.all(
    items.map(async (item) => {
      const cached = cache.get(item.id);
      if (cached) {
        const refreshed = {
          ...cached,
          delivery: item.delivery,
          bounty: item.bounty,
        };
        cache.set(item.id, refreshed);
        return refreshed;
      }
      const decrypted = await decryptMessengerMessage(item, keys);
      cache.set(item.id, decrypted);
      return decrypted;
    }),
  );
}
