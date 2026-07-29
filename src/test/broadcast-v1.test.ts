// @vitest-environment node
import sodium from 'libsodium-wrappers-sumo';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  decryptFeedItem,
  encryptBroadcastContent,
  feedManifestFields,
  recipientKeysDigest,
  serializeBroadcastManifest,
  signBroadcastManifest,
  wrapContentKey,
} from '@/lib/broadcast-crypto';
import { bytesToBase64 } from '@/lib/encoding';
import type { BroadcastFeedItem, DerivedKeys } from '@/types';

let creator: DerivedKeys;
let viewer: DerivedKeys;

beforeAll(async () => {
  await sodium.ready;
  const makeKeys = (): DerivedKeys => {
    const signing = sodium.crypto_sign_keypair();
    const encryption = sodium.crypto_box_keypair();
    return {
      signingPublicKey: new Uint8Array(signing.publicKey),
      signingPrivateKey: new Uint8Array(signing.privateKey),
      encryptionPublicKey: new Uint8Array(encryption.publicKey),
      encryptionPrivateKey: new Uint8Array(encryption.privateKey),
    };
  };
  creator = makeKeys();
  viewer = makeKeys();
});

async function feedItem(source: 'recipient' | 'creator' = 'recipient'): Promise<BroadcastFeedItem> {
  const encrypted = await encryptBroadcastContent('hello encrypted followers');
  const viewerKeys = source === 'creator' ? creator : viewer;
  const viewerWrapped = await wrapContentKey(
    encrypted.contentKey,
    bytesToBase64(viewerKeys.encryptionPublicKey),
  );
  const creatorWrapped = await wrapContentKey(
    encrypted.contentKey,
    bytesToBase64(creator.encryptionPublicKey),
  );
  encrypted.contentKey.fill(0);
  const item: BroadcastFeedItem = {
    id: '507f1f77bcf86cd799439011',
    clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
    creator: { id: '507f1f77bcf86cd799439012', username: 'alice', avatar: null },
    manifest: {
      signatureVersion: 1,
      encryptionVersion: 1,
      contentSuite: 'XCHACHA20-POLY1305-IETF',
      keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
      creatorId: '507f1f77bcf86cd799439012',
      creatorKeyVersion: 1,
      contentCiphertext: encrypted.contentCiphertext,
      contentNonce: encrypted.contentNonce,
      creatorEncryptedBroadcastKey: creatorWrapped,
      audienceType: 'token_holders',
      audienceCount: source === 'creator' ? 0 : 1,
      recipientKeysDigest: await recipientKeysDigest([]),
    },
    viewerKey: { source, keyVersion: 1, encryptedBroadcastKey: viewerWrapped },
    integrity: { algorithm: 'Ed25519', signingPublicKey: bytesToBase64(creator.signingPublicKey), signature: '' },
    publishedAt: '2026-07-28T00:00:00.000Z',
  };
  item.integrity.signature = await signBroadcastManifest(feedManifestFields(item), creator);
  return item;
}

describe('broadcast v1 crypto', () => {
  it('hashes an empty audience as SHA-256 of []', async () => {
    await expect(recipientKeysDigest([])).resolves.toBe(
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    );
  });

  it('sorts recipient digest input canonically by lowercase recipient id', async () => {
    const a = { userId: 'BBBBBBBBBBBBBBBBBBBBBBBB', keyVersion: 2, encryptionPublicKey: 'pub-b', encryptedBroadcastKey: 'wrap-b' };
    const b = { userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', keyVersion: 1, encryptionPublicKey: 'pub-a', encryptedBroadcastKey: 'wrap-a' };
    await expect(recipientKeysDigest([a, b])).resolves.toBe(await recipientKeysDigest([b, a]));
  });

  it('serializes the exact manifest with no trailing newline', () => {
    const serialized = serializeBroadcastManifest({
      encryptionVersion: 1,
      broadcastId: 'ABC', clientBroadcastId: 'DEF', creatorId: 'FED', creatorKeyVersion: 3,
      contentNonce: 'nonce', contentCiphertext: 'cipher', creatorEncryptedBroadcastKey: 'creator-key',
      audienceType: 'token_holders', audienceCount: 2, recipientKeysDigest: 'A'.repeat(64),
    });
    expect(serialized).toContain('Broadcast ID: abc\nClient Broadcast ID: def');
    expect(serialized).toContain('Recipient Keys Digest: ' + 'a'.repeat(64));
    expect(serialized.endsWith('\n')).toBe(false);
  });

  it.each([
    ['received', 'recipient', () => viewer] as const,
    ['sent', 'creator', () => creator] as const,
  ])('verifies and decrypts %s feed items', async (_label, source, keys) => {
    const result = await decryptFeedItem(await feedItem(source), keys());
    expect(result).toMatchObject({ state: 'decrypted', content: 'hello encrypted followers' });
  });

  it('keeps a valid encrypted item locked when private keys are missing', async () => {
    await expect(decryptFeedItem(await feedItem(), null)).resolves.toMatchObject({
      state: 'locked', content: null,
    });
  });

  it('hides invalid signatures and tampered ciphertext', async () => {
    const invalidSignature = await feedItem();
    invalidSignature.integrity.signature = bytesToBase64(new Uint8Array(64));
    await expect(decryptFeedItem(invalidSignature, viewer)).resolves.toMatchObject({ state: 'invalid' });

    const tampered = await feedItem();
    tampered.manifest.contentCiphertext = `${tampered.manifest.contentCiphertext.slice(0, -2)}AA`;
    tampered.integrity.signature = await signBroadcastManifest(feedManifestFields(tampered), creator);
    await expect(decryptFeedItem(tampered, viewer)).resolves.toMatchObject({ state: 'invalid' });
  });

  it('uses fresh random nonces and content keys', async () => {
    const first = await encryptBroadcastContent('same');
    const second = await encryptBroadcastContent('same');
    expect(first.contentCiphertext).not.toBe(second.contentCiphertext);
    expect(first.contentNonce).not.toBe(second.contentNonce);
    first.contentKey.fill(0);
    second.contentKey.fill(0);
  });
});
