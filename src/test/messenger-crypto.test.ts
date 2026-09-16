// @vitest-environment node
import sodium from 'libsodium-wrappers-sumo';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createMessengerEnvelope,
  decryptMessengerMessage,
  serializeMessengerManifest,
} from '@/lib/messenger-crypto';
import { base64ToBytes, bytesToBase64 } from '@/lib/encoding';
import type {
  DerivedKeys,
  MessengerConversationContext,
  MessengerMessageHistoryItem,
} from '@/types';

let sender: DerivedKeys;
let recipient: DerivedKeys;
let context: MessengerConversationContext;

function makeKeys(): DerivedKeys {
  const signing = sodium.crypto_sign_keypair();
  const encryption = sodium.crypto_box_keypair();
  return {
    signingPublicKey: new Uint8Array(signing.publicKey),
    signingPrivateKey: new Uint8Array(signing.privateKey),
    encryptionPublicKey: new Uint8Array(encryption.publicKey),
    encryptionPrivateKey: new Uint8Array(encryption.privateKey),
  };
}

beforeAll(async () => {
  await sodium.ready;
  sender = makeKeys();
  recipient = makeKeys();
  context = {
    conversationId: '507f1f77bcf86cd799439011',
    viewer: {
      id: '507f1f77bcf86cd799439012',
      username: 'sender',
      avatar: null,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      keyVersion: 2,
      signingPublicKey: bytesToBase64(sender.signingPublicKey),
      encryptionPublicKey: bytesToBase64(sender.encryptionPublicKey),
    },
    otherParticipant: {
      id: '507f1f77bcf86cd799439013',
      username: 'recipient',
      avatar: null,
      walletAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
      keyVersion: 4,
      signingPublicKey: bytesToBase64(recipient.signingPublicKey),
      encryptionPublicKey: bytesToBase64(recipient.encryptionPublicKey),
    },
  };
});

function historyItem(
  encrypted: Awaited<ReturnType<typeof createMessengerEnvelope>>,
  source: 'sender' | 'recipient',
): MessengerMessageHistoryItem {
  return {
    id: source === 'sender' ? '507f1f77bcf86cd799439014' : '507f1f77bcf86cd799439015',
    sequence: 1,
    manifest: encrypted.manifest,
    viewerKey: {
      source,
      keyVersion: source === 'sender' ? 2 : 4,
      encryptionPublicKey:
        source === 'sender'
          ? context.viewer.encryptionPublicKey
          : context.otherParticipant.encryptionPublicKey,
      encryptedMessageKey:
        source === 'sender'
          ? encrypted.payload.senderEncryptedMessageKey
          : encrypted.payload.recipientEncryptedMessageKey,
    },
    integrity: {
      algorithm: 'Ed25519',
      signingPublicKey: context.viewer.signingPublicKey,
      signature: encrypted.payload.signature,
    },
    delivery: { seenByRecipient: false },
    bounty: null,
    createdAt: '2026-08-10T12:00:00.000Z',
  };
}

describe('Messenger v1 crypto', () => {
  it('serializes the exact signature manifest with no trailing newline', () => {
    const manifest = {
      signatureVersion: 1 as const,
      encryptionVersion: 1 as const,
      contentSuite: 'XCHACHA20-POLY1305-IETF' as const,
      keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX' as const,
      conversationId: 'ABC',
      clientMessageId: 'DEF',
      senderId: 'AAA',
      recipientId: 'BBB',
      senderKeyVersion: 2,
      recipientKeyVersion: 4,
      senderSigningPublicKey: 'sign',
      senderEncryptionPublicKey: 'sender-box',
      recipientEncryptionPublicKey: 'recipient-box',
      contentNonce: 'nonce',
      contentCiphertext: 'ciphertext',
      senderEncryptedMessageKey: 'sender-wrap',
      recipientEncryptedMessageKey: 'recipient-wrap',
      replyToMessageId: null,
      bountyTerms: null,
    };
    expect(serializeMessengerManifest(manifest)).toBe(
      [
        'BeSeen Encrypted Direct Message',
        'Signature Version: 1',
        'Encryption Version: 1',
        'Content Suite: XCHACHA20-POLY1305-IETF',
        'Key Wrap Suite: X25519-XSALSA20-POLY1305-SEALEDBOX',
        'Conversation ID: abc',
        'Client Message ID: def',
        'Sender ID: aaa',
        'Recipient ID: bbb',
        'Sender Key Version: 2',
        'Recipient Key Version: 4',
        'Sender Signing Public Key: sign',
        'Sender Encryption Public Key: sender-box',
        'Recipient Encryption Public Key: recipient-box',
        'Content Nonce: nonce',
        'Content Ciphertext: ciphertext',
        'Sender Encrypted Message Key: sender-wrap',
        'Recipient Encrypted Message Key: recipient-wrap',
        'Reply To Message ID: none',
        'Bounty Asset Code: none',
        'Bounty Amount: none',
        'Bounty Duration Seconds: none',
      ].join('\n'),
    );
    expect(serializeMessengerManifest(manifest).endsWith('\n')).toBe(false);
  });

  it('encrypts one plaintext into a 24-byte nonce and two independent 80-byte wrapped keys', async () => {
    const encrypted = await createMessengerEnvelope('never send this plaintext', context, sender, {
      clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
    });
    expect(base64ToBytes(encrypted.payload.contentNonce)).toHaveLength(24);
    expect(base64ToBytes(encrypted.payload.senderEncryptedMessageKey)).toHaveLength(80);
    expect(base64ToBytes(encrypted.payload.recipientEncryptedMessageKey)).toHaveLength(80);
    expect(encrypted.payload.senderEncryptedMessageKey).not.toBe(
      encrypted.payload.recipientEncryptedMessageKey,
    );
    expect(JSON.stringify(encrypted.payload)).not.toContain('never send this plaintext');
    expect(encrypted.payload).not.toHaveProperty('plaintext');
  });

  it('lets sender and recipient decrypt their independently wrapped copies', async () => {
    const encrypted = await createMessengerEnvelope('hello privately', context, sender);
    await expect(decryptMessengerMessage(historyItem(encrypted, 'sender'), sender)).resolves.toMatchObject({
      state: 'decrypted',
      plaintext: 'hello privately',
    });
    await expect(decryptMessengerMessage(historyItem(encrypted, 'recipient'), recipient)).resolves.toMatchObject({
      state: 'decrypted',
      plaintext: 'hello privately',
    });
  });

  it('never returns plaintext when the signature is invalid', async () => {
    const encrypted = await createMessengerEnvelope('hidden on invalid signature', context, sender);
    const item = historyItem(encrypted, 'recipient');
    item.integrity.signature = bytesToBase64(new Uint8Array(64));
    await expect(decryptMessengerMessage(item, recipient)).resolves.toMatchObject({
      state: 'invalid',
      plaintext: null,
    });
  });

  it('includes reply and bounty terms in the signed manifest', async () => {
    const encrypted = await createMessengerEnvelope('reply with bounty', context, sender, {
      replyToMessageId: '507F1F77BCF86CD799439099',
      bounty: { contractBountyId: '7', assetCode: 'USDC', amount: '10.25', durationSeconds: 3600 },
    });
    const manifest = serializeMessengerManifest(encrypted.manifest);
    expect(manifest).toContain('Reply To Message ID: 507f1f77bcf86cd799439099');
    expect(manifest).toContain('Bounty Contract ID: 7');
    expect(manifest).toContain('Bounty Asset Code: USDC');
    expect(manifest).toContain('Bounty Amount: 10.25');
    expect(manifest).toContain('Bounty Duration Seconds: 3600');
  });

  it('omits the contract ID line only when there is no bounty at all', async () => {
    const encrypted = await createMessengerEnvelope('no bounty', context, sender);
    const manifest = serializeMessengerManifest(encrypted.manifest);
    expect(manifest).not.toContain('Bounty Contract ID');
    expect(manifest).toContain('Bounty Asset Code: none');
  });

  it('places Bounty Contract ID immediately before the asset lines, byte for byte', async () => {
    const encrypted = await createMessengerEnvelope('contract bounty', context, sender, {
      clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      bounty: { assetCode: 'USDC', amount: '10.25', durationSeconds: 3600, contractBountyId: '7' },
    });
    const manifest = serializeMessengerManifest(encrypted.manifest);
    expect(manifest).toContain(
      [
        'Reply To Message ID: none',
        'Bounty Contract ID: 7',
        'Bounty Asset Code: USDC',
        'Bounty Amount: 10.25',
        'Bounty Duration Seconds: 3600',
      ].join('\n'),
    );
    // Deterministic: serializing the same manifest twice is byte-identical.
    expect(serializeMessengerManifest(encrypted.manifest)).toBe(manifest);
    // The payload carries the same contract bounty ID the manifest signed.
    expect(encrypted.payload.bounty).toMatchObject({ contractBountyId: '7' });
  });

  it('fails decryption when the signed contract bounty ID is tampered with', async () => {
    const encrypted = await createMessengerEnvelope('contract bounty', context, sender, {
      bounty: { assetCode: 'USDC', amount: '10.25', durationSeconds: 3600, contractBountyId: '7' },
    });
    const item = historyItem(encrypted, 'recipient');
    item.manifest = {
      ...item.manifest,
      bountyTerms: { assetCode: 'USDC', amount: '10.25', durationSeconds: 3600, contractBountyId: '8' },
    };
    await expect(decryptMessengerMessage(item, recipient)).resolves.toMatchObject({
      state: 'invalid',
      plaintext: null,
    });
  });
});
