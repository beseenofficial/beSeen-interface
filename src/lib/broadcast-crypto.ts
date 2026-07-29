import sodium from 'libsodium-wrappers-sumo';
import { base64ToBytes, bytesToBase64, bytesToHex, utf8 } from '@/lib/encoding';
import { signBytes, verifyBytes } from '@/lib/keys';
import type {
  BroadcastDraft,
  BroadcastFeedItem,
  BroadcastRecipient,
  DecryptedBroadcast,
  DerivedKeys,
} from '@/types';

export const MAX_BROADCAST_BYTES = 65_536;

export type EncryptedContent = {
  contentKey: Uint8Array;
  contentCiphertext: string;
  contentNonce: string;
};

export async function encryptBroadcastContent(plaintext: string): Promise<EncryptedContent> {
  const message = utf8(plaintext);
  if (message.length > MAX_BROADCAST_BYTES) {
    throw new Error('Broadcasts must be 65,536 UTF-8 bytes or fewer.');
  }
  await sodium.ready;
  const contentKey = sodium.randombytes_buf(32);
  const nonce = sodium.randombytes_buf(24);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    null,
    null,
    nonce,
    contentKey,
  );
  return {
    contentKey: new Uint8Array(contentKey),
    contentCiphertext: bytesToBase64(ciphertext),
    contentNonce: bytesToBase64(nonce),
  };
}

export async function wrapContentKey(contentKey: Uint8Array, publicKeyBase64: string): Promise<string> {
  await sodium.ready;
  if (contentKey.length !== 32) throw new Error('The broadcast content key is invalid.');
  const wrapped = sodium.crypto_box_seal(contentKey, base64ToBytes(publicKeyBase64, 32));
  if (wrapped.length !== 80) throw new Error('The wrapped broadcast key is invalid.');
  return bytesToBase64(wrapped);
}

export async function unwrapContentKey(
  wrappedBase64: string,
  keys: DerivedKeys,
): Promise<Uint8Array> {
  await sodium.ready;
  const opened = sodium.crypto_box_seal_open(
    base64ToBytes(wrappedBase64, 80),
    keys.encryptionPublicKey,
    keys.encryptionPrivateKey,
  );
  if (!opened || opened.length !== 32) throw new Error('The broadcast key could not be opened.');
  return new Uint8Array(opened);
}

export type ManifestFields = {
  encryptionVersion: number;
  broadcastId: string;
  clientBroadcastId: string;
  creatorId: string;
  creatorKeyVersion: number;
  contentNonce: string;
  contentCiphertext: string;
  creatorEncryptedBroadcastKey: string;
  audienceType: string;
  audienceCount: number;
  recipientKeysDigest: string;
};

export function serializeBroadcastManifest(fields: ManifestFields): string {
  return [
    'BeSeen Encrypted Broadcast',
    'Signature Version: 1',
    `Encryption Version: ${fields.encryptionVersion}`,
    'Content Suite: XCHACHA20-POLY1305-IETF',
    'Key Wrap Suite: X25519-XSALSA20-POLY1305-SEALEDBOX',
    `Broadcast ID: ${fields.broadcastId.toLowerCase()}`,
    `Client Broadcast ID: ${fields.clientBroadcastId.toLowerCase()}`,
    `Creator ID: ${fields.creatorId.toLowerCase()}`,
    `Creator Key Version: ${fields.creatorKeyVersion}`,
    `Content Nonce: ${fields.contentNonce}`,
    `Content Ciphertext: ${fields.contentCiphertext}`,
    `Creator Encrypted Broadcast Key: ${fields.creatorEncryptedBroadcastKey}`,
    `Audience Type: ${fields.audienceType}`,
    `Audience Count: ${fields.audienceCount}`,
    `Recipient Keys Digest: ${fields.recipientKeysDigest.toLowerCase()}`,
  ].join('\n');
}

export async function recipientKeysDigest(
  recipients: Array<
    Pick<BroadcastRecipient, 'userId' | 'keyVersion' | 'encryptionPublicKey'> & {
      encryptedBroadcastKey: string;
    }
  >,
): Promise<string> {
  const manifest = recipients
    .map((recipient) => [
      recipient.userId.toLowerCase(),
      recipient.keyVersion,
      recipient.encryptionPublicKey,
      recipient.encryptedBroadcastKey,
    ])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(utf8(JSON.stringify(manifest))),
  );
  return bytesToHex(new Uint8Array(digest));
}

export function draftManifestFields(
  draft: BroadcastDraft,
  creatorId: string,
  content: Pick<EncryptedContent, 'contentCiphertext' | 'contentNonce'>,
  creatorEncryptedBroadcastKey: string,
  digest: string,
): ManifestFields {
  return {
    encryptionVersion: draft.encryption.version,
    broadcastId: draft.id,
    clientBroadcastId: draft.clientBroadcastId,
    creatorId,
    creatorKeyVersion: draft.creatorKey.keyVersion,
    contentNonce: content.contentNonce,
    contentCiphertext: content.contentCiphertext,
    creatorEncryptedBroadcastKey,
    audienceType: draft.audience.type,
    audienceCount: draft.audience.count,
    recipientKeysDigest: digest,
  };
}

export function feedManifestFields(item: BroadcastFeedItem): ManifestFields {
  return {
    encryptionVersion: item.manifest.encryptionVersion,
    broadcastId: item.id,
    clientBroadcastId: item.clientBroadcastId,
    creatorId: item.manifest.creatorId,
    creatorKeyVersion: item.manifest.creatorKeyVersion,
    contentNonce: item.manifest.contentNonce,
    contentCiphertext: item.manifest.contentCiphertext,
    creatorEncryptedBroadcastKey: item.manifest.creatorEncryptedBroadcastKey,
    audienceType: item.manifest.audienceType,
    audienceCount: item.manifest.audienceCount,
    recipientKeysDigest: item.manifest.recipientKeysDigest,
  };
}

export async function signBroadcastManifest(fields: ManifestFields, keys: DerivedKeys): Promise<string> {
  return signBytes(utf8(serializeBroadcastManifest(fields)), keys.signingPrivateKey);
}

export async function decryptFeedItem(
  item: BroadcastFeedItem,
  keys: DerivedKeys | null,
): Promise<DecryptedBroadcast> {
  const valid = await verifyBytes(
    utf8(serializeBroadcastManifest(feedManifestFields(item))),
    item.integrity.signature,
    item.integrity.signingPublicKey,
  );
  if (!valid) return { ...item, content: null, state: 'invalid' };
  if (!keys) return { ...item, content: null, state: 'locked' };
  let contentKey: Uint8Array | null = null;
  try {
    contentKey = await unwrapContentKey(item.viewerKey.encryptedBroadcastKey, keys);
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
      content: new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
      state: 'decrypted',
    };
  } catch {
    return { ...item, content: null, state: 'invalid' };
  } finally {
    contentKey?.fill(0);
  }
}
