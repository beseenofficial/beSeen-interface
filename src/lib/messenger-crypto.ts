import sodium from 'libsodium-wrappers-sumo';
import {
  encryptBroadcastContent,
  unwrapContentKey,
  wrapContentKey,
} from '@/lib/broadcast-crypto';
import { base64ToBytes, bytesToBase64, utf8 } from '@/lib/encoding';
import { signBytes, verifyBytes } from '@/lib/keys';
import type {
  DecryptedMessengerMessage,
  DerivedKeys,
  MessengerBountyTerms,
  MessengerConversationContext,
  MessengerMessageHistoryItem,
  MessengerMessageManifest,
  MessengerSendMessagePayload,
} from '@/types';

export const MAX_MESSENGER_BYTES = 65_536;
export const MESSENGER_CONTENT_SUITE = 'XCHACHA20-POLY1305-IETF' as const;
export const MESSENGER_KEY_WRAP_SUITE =
  'X25519-XSALSA20-POLY1305-SEALEDBOX' as const;

const CANONICAL_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;

export function validateMessengerBountyTerms(terms: MessengerBountyTerms): void {
  if (terms.assetCode !== 'USDC') {
    throw new Error('Message bounties support USDC only.');
  }
  if (!CANONICAL_AMOUNT.test(terms.amount) || /^0(?:\.0+)?$/.test(terms.amount)) {
    throw new Error('Enter a valid reward amount with up to 7 decimal places.');
  }
  if (
    !Number.isInteger(terms.durationSeconds) ||
    terms.durationSeconds < 1 ||
    terms.durationSeconds > 31_536_000
  ) {
    throw new Error('Choose how long the reward stays available.');
  }
}

export function serializeMessengerManifest(fields: MessengerMessageManifest): string {
  const bounty = fields.bountyTerms;
  return [
    'BeSeen Encrypted Direct Message',
    `Signature Version: ${fields.signatureVersion}`,
    `Encryption Version: ${fields.encryptionVersion}`,
    `Content Suite: ${fields.contentSuite}`,
    `Key Wrap Suite: ${fields.keyWrapSuite}`,
    `Conversation ID: ${fields.conversationId.toLowerCase()}`,
    `Client Message ID: ${fields.clientMessageId.toLowerCase()}`,
    `Sender ID: ${fields.senderId.toLowerCase()}`,
    `Recipient ID: ${fields.recipientId.toLowerCase()}`,
    `Sender Key Version: ${fields.senderKeyVersion}`,
    `Recipient Key Version: ${fields.recipientKeyVersion}`,
    `Sender Signing Public Key: ${fields.senderSigningPublicKey}`,
    `Sender Encryption Public Key: ${fields.senderEncryptionPublicKey}`,
    `Recipient Encryption Public Key: ${fields.recipientEncryptionPublicKey}`,
    `Content Nonce: ${fields.contentNonce}`,
    `Content Ciphertext: ${fields.contentCiphertext}`,
    `Sender Encrypted Message Key: ${fields.senderEncryptedMessageKey}`,
    `Recipient Encrypted Message Key: ${fields.recipientEncryptedMessageKey}`,
    `Reply To Message ID: ${fields.replyToMessageId?.toLowerCase() ?? 'none'}`,
    // Only a contract-backed bounty adds this line, and always before the
    // asset/amount/duration lines, matching the server's canonical manifest.
    ...(bounty?.contractBountyId
      ? [`Bounty Contract ID: ${bounty.contractBountyId}`]
      : []),
    `Bounty Asset Code: ${bounty?.assetCode ?? 'none'}`,
    `Bounty Amount: ${bounty?.amount ?? 'none'}`,
    `Bounty Duration Seconds: ${bounty?.durationSeconds ?? 'none'}`,
  ].join('\n');
}

export type CreateMessengerEnvelopeOptions = {
  clientMessageId?: string;
  replyToMessageId?: string | null;
  bounty?: MessengerBountyTerms | null;
};

export async function createMessengerEnvelope(
  plaintext: string,
  context: MessengerConversationContext,
  keys: DerivedKeys,
  options: CreateMessengerEnvelopeOptions = {},
): Promise<{ payload: MessengerSendMessagePayload; manifest: MessengerMessageManifest }> {
  if (utf8(plaintext).length > MAX_MESSENGER_BYTES) {
    throw new Error('This message is too long. Shorten it and try again.');
  }
  if (!plaintext.trim()) throw new Error('Write a message before sending.');
  const localSigningPublicKey = bytesToBase64(keys.signingPublicKey);
  const localEncryptionPublicKey = bytesToBase64(keys.encryptionPublicKey);
  if (
    context.viewer.signingPublicKey !== localSigningPublicKey ||
    context.viewer.encryptionPublicKey !== localEncryptionPublicKey
  ) {
    throw new Error('Messaging is not ready for this session. Sign in again and try once more.');
  }

  const bounty = options.bounty ?? null;
  if (bounty) validateMessengerBountyTerms(bounty);
  const clientMessageId = (options.clientMessageId ?? crypto.randomUUID()).toLowerCase();
  const replyToMessageId = options.replyToMessageId?.toLowerCase() ?? null;
  const encrypted = await encryptBroadcastContent(plaintext);
  try {
    const [senderEncryptedMessageKey, recipientEncryptedMessageKey] = await Promise.all([
      wrapContentKey(encrypted.contentKey, context.viewer.encryptionPublicKey),
      wrapContentKey(encrypted.contentKey, context.otherParticipant.encryptionPublicKey),
    ]);
    const manifest: MessengerMessageManifest = {
      signatureVersion: 1,
      encryptionVersion: 1,
      contentSuite: MESSENGER_CONTENT_SUITE,
      keyWrapSuite: MESSENGER_KEY_WRAP_SUITE,
      conversationId: context.conversationId.toLowerCase(),
      clientMessageId,
      senderId: context.viewer.id.toLowerCase(),
      recipientId: context.otherParticipant.id.toLowerCase(),
      senderKeyVersion: context.viewer.keyVersion,
      recipientKeyVersion: context.otherParticipant.keyVersion,
      senderSigningPublicKey: context.viewer.signingPublicKey,
      senderEncryptionPublicKey: context.viewer.encryptionPublicKey,
      recipientEncryptionPublicKey: context.otherParticipant.encryptionPublicKey,
      contentNonce: encrypted.contentNonce,
      contentCiphertext: encrypted.contentCiphertext,
      senderEncryptedMessageKey,
      recipientEncryptedMessageKey,
      replyToMessageId,
      bountyTerms: bounty,
    };
    const signature = await signBytes(
      utf8(serializeMessengerManifest(manifest)),
      keys.signingPrivateKey,
    );
    return {
      manifest,
      payload: {
        clientMessageId,
        contentCiphertext: manifest.contentCiphertext,
        contentNonce: manifest.contentNonce,
        senderEncryptedMessageKey,
        recipientEncryptedMessageKey,
        replyToMessageId,
        bounty,
        signature,
      },
    };
  } finally {
    encrypted.contentKey.fill(0);
  }
}

export async function decryptMessengerMessage(
  item: MessengerMessageHistoryItem,
  keys: DerivedKeys,
): Promise<DecryptedMessengerMessage> {
  if (item.integrity.signingPublicKey !== item.manifest.senderSigningPublicKey) {
    return { ...item, plaintext: null, state: 'invalid' };
  }
  const verified = await verifyBytes(
    utf8(serializeMessengerManifest(item.manifest)),
    item.integrity.signature,
    item.integrity.signingPublicKey,
  );
  if (!verified) return { ...item, plaintext: null, state: 'invalid' };

  let contentKey: Uint8Array | null = null;
  try {
    contentKey = await unwrapContentKey(item.viewerKey.encryptedMessageKey, keys);
    await sodium.ready;
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      base64ToBytes(item.manifest.contentCiphertext),
      null,
      base64ToBytes(item.manifest.contentNonce, 24),
      contentKey,
    );
    return {
      ...item,
      plaintext: new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
      state: 'decrypted',
    };
  } catch {
    return { ...item, plaintext: null, state: 'invalid' };
  } finally {
    contentKey?.fill(0);
  }
}
