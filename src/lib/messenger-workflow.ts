import { ApiError, getMessengerConversationContext, sendMessengerMessage } from '@/lib/api';
import { createMessengerEnvelope } from '@/lib/messenger-crypto';
import { deleteSecureRecord, getSecureJson, setSecureJson } from '@/lib/secure-storage';
import type {
  DerivedKeys,
  MessengerBountyTerms,
  MessengerSendMessagePayload,
  MessengerSentMessage,
} from '@/types';

export type PendingMessengerAttempt = {
  conversationId: string;
  payload: MessengerSendMessagePayload;
  createdAt: string;
};

const attemptRecord = (conversationId: string) =>
  `messenger-send-attempt:${conversationId.toLowerCase()}`;

export async function loadPendingMessengerAttempt(
  conversationId: string,
): Promise<PendingMessengerAttempt | null> {
  const attempt = await getSecureJson<PendingMessengerAttempt>(attemptRecord(conversationId));
  return attempt?.conversationId === conversationId.toLowerCase() ? attempt : null;
}

export async function discardPendingMessengerAttempt(conversationId: string): Promise<void> {
  await deleteSecureRecord(attemptRecord(conversationId));
}

async function deliverAttempt(attempt: PendingMessengerAttempt): Promise<{
  message: MessengerSentMessage;
  created: boolean;
}> {
  try {
    const result = await sendMessengerMessage(attempt.conversationId, attempt.payload);
    await discardPendingMessengerAttempt(attempt.conversationId);
    return result;
  } catch (cause) {
    if (
      cause instanceof ApiError &&
      cause.status === 409 &&
      cause.code === 'INSUFFICIENT_DEMO_USDC_BALANCE'
    ) {
      // This is a definitive rejection, not an unknown network result. Keep the
      // visible plaintext draft, but discard the encrypted retry record.
      await discardPendingMessengerAttempt(attempt.conversationId);
    }
    throw cause;
  }
}

export async function createAndSendMessengerMessage(input: {
  conversationId: string;
  plaintext: string;
  keys: DerivedKeys;
  replyToMessageId?: string | null;
  bounty?: MessengerBountyTerms | null;
}): Promise<{ message: MessengerSentMessage; created: boolean }> {
  const context = await getMessengerConversationContext(input.conversationId);
  const { payload } = await createMessengerEnvelope(input.plaintext, context, input.keys, {
    replyToMessageId: input.replyToMessageId,
    bounty: input.bounty,
  });
  const attempt: PendingMessengerAttempt = {
    conversationId: input.conversationId.toLowerCase(),
    payload,
    createdAt: new Date().toISOString(),
  };
  await setSecureJson(attemptRecord(input.conversationId), attempt);
  return deliverAttempt(attempt);
}

export async function retryPendingMessengerMessage(
  conversationId: string,
): Promise<{ message: MessengerSentMessage; created: boolean }> {
  const attempt = await loadPendingMessengerAttempt(conversationId);
  if (!attempt) throw new Error('There is no message waiting to be sent again.');
  return deliverAttempt(attempt);
}
