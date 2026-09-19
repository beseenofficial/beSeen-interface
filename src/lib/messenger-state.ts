import type { DecryptedBroadcast, DecryptedMessengerMessage, MessengerBounty } from '@/types';

export type MessengerTimelineItem =
  | { kind: 'message'; createdAt: string; message: DecryptedMessengerMessage }
  | { kind: 'broadcast'; createdAt: string; broadcast: DecryptedBroadcast };

export function mergeMessengerTimeline(
  messages: DecryptedMessengerMessage[],
  receivedBroadcasts: DecryptedBroadcast[],
  participantId: string | null,
): MessengerTimelineItem[] {
  const broadcasts = participantId
    ? receivedBroadcasts.filter((item) => item.creator.id === participantId)
    : [];
  return [
    ...messages.map((message) => ({ kind: 'message' as const, createdAt: message.createdAt, message })),
    ...broadcasts.map((broadcast) => ({ kind: 'broadcast' as const, createdAt: broadcast.publishedAt, broadcast })),
  ].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function mergeMessengerMessages(
  current: DecryptedMessengerMessage[],
  incoming: DecryptedMessengerMessage[],
): DecryptedMessengerMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    const previous = byId.get(message.id);
    const previousBounty = previous?.bounty;
    const incomingBounty = message.bounty;
    const keepConfirmedRefund =
      Boolean(previousBounty) &&
      Boolean(incomingBounty) &&
      previousBounty?.id === incomingBounty?.id &&
      previousBounty?.fundingStatus === 'contract_refunded' &&
      incomingBounty?.fundingStatus !== 'contract_refunded';
    byId.set(
      message.id,
      keepConfirmedRefund
        ? {
            ...message,
            bounty: { ...message.bounty!, fundingStatus: 'contract_refunded' },
          }
        : message,
    );
  }
  return [...byId.values()].sort((left, right) => right.sequence - left.sequence);
}

export function firstUnreadMessageId(
  messages: DecryptedMessengerMessage[],
  viewerId: string,
  afterSequence: number | null,
): string | null {
  if (afterSequence === null) return null;
  const firstUnread = messages
    .filter(
      (message) =>
        message.sequence > afterSequence && message.manifest.recipientId === viewerId,
    )
    .sort((left, right) => left.sequence - right.sequence)[0];
  return firstUnread?.id ?? null;
}

export function applyUnlockedBounty(
  messages: DecryptedMessengerMessage[],
  unlockedBounty: MessengerBounty,
): DecryptedMessengerMessage[] {
  return messages.map((message) =>
    message.bounty?.id === unlockedBounty.id
      ? { ...message, bounty: unlockedBounty }
      : message,
  );
}

