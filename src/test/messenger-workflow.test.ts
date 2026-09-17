// @vitest-environment node
import sodium from 'libsodium-wrappers-sumo';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { bytesToBase64 } from '@/lib/encoding';
import type { DerivedKeys, MessengerConversationContext, MessengerSentMessage } from '@/types';

const storage = vi.hoisted(() => new Map<string, unknown>());
const api = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(message: string, public status: number, public code: string) { super(message); }
  }
  return { context: vi.fn(), send: vi.fn(), ApiError };
});

vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async (id: string) => storage.get(id) ?? null),
  setSecureJson: vi.fn(async (id: string, value: unknown) => void storage.set(id, structuredClone(value))),
  deleteSecureRecord: vi.fn(async (id: string) => void storage.delete(id)),
}));
vi.mock('@/lib/api', () => ({
  getMessengerConversationContext: api.context,
  sendMessengerMessage: api.send,
  ApiError: api.ApiError,
}));

import {
  createAndSendMessengerMessage,
  loadPendingMessengerAttempt,
  retryPendingMessengerMessage,
} from '@/lib/messenger-workflow';

let keys: DerivedKeys;
let context: MessengerConversationContext;
const conversationId = '507f1f77bcf86cd799439011';

beforeAll(async () => {
  await sodium.ready;
  const signing = sodium.crypto_sign_keypair();
  const encryption = sodium.crypto_box_keypair();
  const recipientSigning = sodium.crypto_sign_keypair();
  const recipientEncryption = sodium.crypto_box_keypair();
  keys = {
    signingPublicKey: new Uint8Array(signing.publicKey),
    signingPrivateKey: new Uint8Array(signing.privateKey),
    encryptionPublicKey: new Uint8Array(encryption.publicKey),
    encryptionPrivateKey: new Uint8Array(encryption.privateKey),
  };
  context = {
    conversationId,
    viewer: {
      id: '507f1f77bcf86cd799439012', username: 'sender', avatar: null, keyVersion: 1,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      signingPublicKey: bytesToBase64(keys.signingPublicKey),
      encryptionPublicKey: bytesToBase64(keys.encryptionPublicKey),
    },
    otherParticipant: {
      id: '507f1f77bcf86cd799439013', username: 'recipient', avatar: null, keyVersion: 1,
      walletAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
      signingPublicKey: bytesToBase64(recipientSigning.publicKey),
      encryptionPublicKey: bytesToBase64(recipientEncryption.publicKey),
    },
  };
});

describe('Messenger unknown-result retry', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    api.context.mockResolvedValue(context);
  });

  it('reuses the identical UUID and encrypted envelope', async () => {
    const sent: unknown[] = [];
    const response: MessengerSentMessage = {
      id: '507f1f77bcf86cd799439020', conversationId, sequence: 1,
      clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      senderId: context.viewer.id, recipientId: context.otherParticipant.id,
      replyToMessageId: null, bounty: null, unlockedBounty: null,
      createdAt: '2026-08-10T12:00:00.000Z',
    };
    api.send
      .mockImplementationOnce(async (_conversationId: string, payload: unknown) => {
        sent.push(structuredClone(payload));
        throw new TypeError('network result unknown');
      })
      .mockImplementationOnce(async (_conversationId: string, payload: unknown) => {
        sent.push(structuredClone(payload));
        return { message: response, created: false };
      });

    await expect(createAndSendMessengerMessage({
      conversationId,
      plaintext: 'do not send plaintext',
      keys,
    })).rejects.toThrow(/unknown/i);
    expect(await loadPendingMessengerAttempt(conversationId)).not.toBeNull();
    await expect(retryPendingMessengerMessage(conversationId)).resolves.toMatchObject({ created: false });
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    expect(JSON.stringify(sent[0])).not.toContain('do not send plaintext');
    expect(await loadPendingMessengerAttempt(conversationId)).toBeNull();
  });

  it('keeps the encrypted retry record after a server rejection, because the bounty may already be locked on-chain', async () => {
    // Even a definitive-looking 400 must not silently drop the attempt: the
    // lock_bounty transaction already succeeded, so the user decides between
    // an explicit retry and an explicit discard.
    api.send.mockRejectedValueOnce(
      new api.ApiError('invalid bounty payload', 400, 'VALIDATION_ERROR'),
    );
    await expect(createAndSendMessengerMessage({
      conversationId,
      plaintext: 'keep this visible draft',
      keys,
      bounty: { contractBountyId: '3', assetCode: 'USDC', amount: '10', durationSeconds: 3600 },
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await loadPendingMessengerAttempt(conversationId)).not.toBeNull();
  });

  it('retries a contract-bounty message byte-identically, without re-signing or re-locking', async () => {
    const sent: unknown[] = [];
    const response: MessengerSentMessage = {
      id: '507f1f77bcf86cd799439020', conversationId, sequence: 1,
      clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      senderId: context.viewer.id, recipientId: context.otherParticipant.id,
      replyToMessageId: null, bounty: null, unlockedBounty: null,
      createdAt: '2026-08-10T12:00:00.000Z',
    };
    api.send
      .mockImplementationOnce(async (_conversationId: string, payload: unknown) => {
        sent.push(structuredClone(payload));
        throw new TypeError('network result unknown');
      })
      .mockImplementationOnce(async (_conversationId: string, payload: unknown) => {
        sent.push(structuredClone(payload));
        return { message: response, created: false };
      });

    // The caller locks the bounty on-chain first and passes the contract ID in.
    await expect(createAndSendMessengerMessage({
      conversationId,
      plaintext: 'bounty is already locked on-chain',
      keys,
      clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      bounty: { assetCode: 'USDC', amount: '10', durationSeconds: 3600, contractBountyId: '7' },
    })).rejects.toThrow(/unknown/i);
    await expect(retryPendingMessengerMessage(conversationId)).resolves.toMatchObject({ created: false });

    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    const payload = sent[0] as { clientMessageId: string; bounty: { contractBountyId: string } };
    expect(payload.clientMessageId).toBe('2f2b1762-f0f5-4b1b-8acd-70afcf043365');
    expect(payload.bounty.contractBountyId).toBe('7');
    expect(await loadPendingMessengerAttempt(conversationId)).toBeNull();
  });
});
