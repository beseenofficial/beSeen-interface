// @vitest-environment node
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, utf8 } from '@/lib/encoding';
import { buildKdfTransaction, deriveKeys, serializeLoginProof, signBytes, verifyBytes } from '@/lib/keys';
import type { AuthConfig } from '@/types';

const config: AuthConfig = {
  stellarNetwork: 'testnet',
  networkPassphrase: Networks.TESTNET,
  keyDerivation: {
    version: 1,
    source: 'STELLAR_WALLET_FIXED_TRANSACTION_SIGNATURE',
    walletMethod: 'signTransaction',
    transaction: {
      builtBy: 'client', sourceAccount: 'connected-wallet', sequence: '0', feeStroops: '100',
      timeBounds: { minTime: '0', maxTime: '0' }, memo: 'none',
      operation: { type: 'manageData', name: 'beseen_kdf_v1', value: 'beseen.fi/key-derivation/v1' },
      submissionRequired: false,
    },
    signature: { lengthBytes: 64, sentToServer: false },
    kdf: {
      name: 'HKDF-SHA-256', salt: 'beseen.fi/key-derivation/v1', seedLengthBytes: 32,
      signingInfo: 'beseen.fi/ed25519-signing-key/v1',
      encryptionInfo: 'beseen.fi/x25519-encryption-key/v1',
    },
    signingAlgorithm: 'Ed25519', encryptionAlgorithm: 'X25519', privateKeyStorage: 'client-only',
  },
  registration: {}, login: { proof: 'DERIVED_ED25519_SIGNATURE', version: 1, maxAgeSeconds: 300 }, session: {},
};

function walletSigner(wallet: Keypair) {
  return async (xdr: string) => {
    const transaction = new Transaction(xdr, Networks.TESTNET);
    transaction.sign(wallet);
    return transaction.toEnvelope().toXDR('base64');
  };
}

describe('fixed derivation transaction and keys', () => {
  it('builds the exact sequence, fee, time bounds, memo, and manageData operation', () => {
    const wallet = Keypair.random().publicKey();
    const transaction = buildKdfTransaction(wallet, Networks.TESTNET);
    expect(transaction.source).toBe(wallet);
    expect(transaction.sequence).toBe('0');
    expect(transaction.fee).toBe('100');
    expect(transaction.memo.type).toBe('none');
    expect(transaction.timeBounds).toEqual({ minTime: '0', maxTime: '0' });
    expect(transaction.operations).toEqual([
      expect.objectContaining({ type: 'manageData', name: 'beseen_kdf_v1' }),
    ]);
  });

  it('derives deterministic, domain-separated Ed25519 and X25519 keys', async () => {
    const wallet = Keypair.random();
    const first = await deriveKeys(wallet.publicKey(), config, walletSigner(wallet));
    const second = await deriveKeys(wallet.publicKey(), config, walletSigner(wallet));
    expect(bytesToBase64(first.signingPublicKey)).toBe(bytesToBase64(second.signingPublicKey));
    expect(bytesToBase64(first.encryptionPublicKey)).toBe(bytesToBase64(second.encryptionPublicKey));
    expect(bytesToBase64(first.signingPublicKey)).not.toBe(bytesToBase64(first.encryptionPublicKey));
  });

  it('serializes the exact login proof and signs canonical bytes', async () => {
    const wallet = Keypair.random();
    const keys = await deriveKeys(wallet.publicKey(), config, walletSigner(wallet));
    const requestId = '2f2b1762-f0f5-4b1b-8acd-70afcf043365';
    const issuedAt = '2026-07-28T00:00:00.000Z';
    const proof = serializeLoginProof(wallet.publicKey().toLowerCase(), requestId.toUpperCase(), issuedAt);
    expect(proof).toBe(`BeSeen Login\nVersion: 1\nWallet Address: ${wallet.publicKey()}\nRequest ID: ${requestId}\nIssued At: ${issuedAt}`);
    const signature = await signBytes(utf8(proof), keys.signingPrivateKey);
    await expect(verifyBytes(utf8(proof), signature, bytesToBase64(keys.signingPublicKey))).resolves.toBe(true);
  });

  it('accepts only canonical padded base64', () => {
    const value = bytesToBase64(new Uint8Array(32).fill(7));
    expect(value).toMatch(/=$/);
    expect(base64ToBytes(value, 32)).toHaveLength(32);
    expect(() => base64ToBytes(value.replace(/=$/, ''), 32)).toThrow(/canonical/i);
  });
});
