// @vitest-environment node
import sodium from 'libsodium-wrappers-sumo';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BroadcastDraft, BroadcastRecipient, DerivedKeys, User } from '@/types';

const state = vi.hoisted(() => ({ records: new Map<string, unknown>(), serverWrapped: '' }));
const api = vi.hoisted(() => ({
  createDraft: vi.fn(), recipients: vi.fn(), uploadKeys: vi.fn(), finalize: vi.fn(), drafts: vi.fn(), cancel: vi.fn(), feed: vi.fn(),
}));

vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async (id: string) => state.records.get(id) ?? null),
  setSecureJson: vi.fn(async (id: string, value: unknown) => void state.records.set(id, structuredClone(value))),
  deleteSecureRecord: vi.fn(async (id: string) => void state.records.delete(id)),
}));
vi.mock('@/lib/api', () => ({ broadcastApi: api }));

import { publishEncryptedBroadcast } from '@/lib/broadcast-workflow';

describe('interrupted encrypted draft retry', () => {
  beforeEach(() => {
    state.records.clear();
    state.serverWrapped = '';
    vi.clearAllMocks();
  });

  it('reuses the exact already-uploaded sealed ciphertext on retry', async () => {
    await sodium.ready;
    const signing = sodium.crypto_sign_keypair();
    const encryption = sodium.crypto_box_keypair();
    const recipient = sodium.crypto_box_keypair();
    const keys: DerivedKeys = {
      signingPublicKey: new Uint8Array(signing.publicKey), signingPrivateKey: new Uint8Array(signing.privateKey),
      encryptionPublicKey: new Uint8Array(encryption.publicKey), encryptionPrivateKey: new Uint8Array(encryption.privateKey),
    };
    const user: User = { id: '507f1f77bcf86cd799439010', username: 'sender', avatar: null, createdAt: '2026-01-01T00:00:00.000Z' };
    const recipientRecord: BroadcastRecipient = {
      userId: '507f1f77bcf86cd799439011', username: 'viewer', keyVersion: 1,
      encryptionPublicKey: sodium.to_base64(recipient.publicKey, sodium.base64_variants.ORIGINAL),
      keyUploaded: false, encryptedBroadcastKey: null,
    };
    const draft: BroadcastDraft = {
      id: '507f1f77bcf86cd799439012', clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365', status: 'draft',
      audience: { type: 'token_holders', count: 1 },
      encryption: { version: 1, contentSuite: 'XCHACHA20-POLY1305-IETF', keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX' },
      creatorKey: { keyVersion: 1, encryptionPublicKey: sodium.to_base64(encryption.publicKey, sodium.base64_variants.ORIGINAL) },
      progress: { uploadedCount: 0, remainingCount: 1, complete: false },
      recipients: { items: [recipientRecord], nextCursor: null, hasMore: false },
      createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2030-01-01T00:00:00.000Z',
    };
    api.createDraft.mockResolvedValue(draft);
    api.uploadKeys.mockImplementationOnce(async (_id, uploaded) => {
      state.serverWrapped = uploaded[0].encryptedBroadcastKey;
      recipientRecord.keyUploaded = true;
      recipientRecord.encryptedBroadcastKey = state.serverWrapped;
      draft.progress = { uploadedCount: 1, remainingCount: 0, complete: true };
      throw new Error('connection dropped after acceptance');
    });
    api.finalize.mockResolvedValue({
      id: draft.id, audience: draft.audience, status: 'published',
    });

    await expect(publishEncryptedBroadcast('never sent as plaintext', user, keys)).rejects.toThrow(/connection dropped/i);
    expect(state.serverWrapped).toHaveLength(108);
    await expect(publishEncryptedBroadcast('edited text is ignored for the retry', user, keys)).resolves.toMatchObject({ status: 'published' });
    expect(api.uploadKeys).toHaveBeenCalledTimes(1);
    const finalizeBody = api.finalize.mock.calls[0][1];
    expect(finalizeBody).not.toHaveProperty('plaintext');
  });
});
