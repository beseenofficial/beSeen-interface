// @vitest-environment node
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bytesToBase64 } from '@/lib/encoding';
import type { AuthConfig } from '@/types';

const storage = vi.hoisted(() => ({
  getAccountBoundJson: vi.fn(),
  setAccountBoundJson: vi.fn(),
  deleteAccountBoundRecord: vi.fn(),
  deleteSecureRecordsWithPrefix: vi.fn(),
}));

vi.mock('@/lib/secure-storage', () => storage);

import { deriveAndSaveKeys, loadKeys } from '@/lib/keys';

const config: AuthConfig = {
  stellarNetwork: 'testnet',
  networkPassphrase: Networks.TESTNET,
  keyDerivation: {
    version: 1,
    source: 'STELLAR_WALLET_FIXED_TRANSACTION_SIGNATURE',
    walletMethod: 'signTransaction',
    transaction: {
      builtBy: 'client',
      sourceAccount: 'connected-wallet',
      sequence: '0',
      feeStroops: '100',
      timeBounds: { minTime: '0', maxTime: '0' },
      memo: 'none',
      operation: {
        type: 'manageData',
        name: 'beseen_kdf_v1',
        value: 'beseen.fi/key-derivation/v1',
      },
      submissionRequired: false,
    },
    signature: { lengthBytes: 64, sentToServer: false },
    kdf: {
      name: 'HKDF-SHA-256',
      salt: 'beseen.fi/key-derivation/v1',
      seedLengthBytes: 32,
      signingInfo: 'beseen.fi/ed25519-signing-key/v1',
      encryptionInfo: 'beseen.fi/x25519-encryption-key/v1',
    },
    signingAlgorithm: 'Ed25519',
    encryptionAlgorithm: 'X25519',
    privateKeyStorage: 'client-only',
  },
  registration: {},
  login: {
    proof: 'DERIVED_ED25519_SIGNATURE',
    version: 1,
    maxAgeSeconds: 300,
  },
  session: {},
};

beforeEach(() => {
  storage.getAccountBoundJson.mockResolvedValue(null);
  storage.setAccountBoundJson.mockResolvedValue(undefined);
  storage.deleteAccountBoundRecord.mockResolvedValue(undefined);
  storage.deleteSecureRecordsWithPrefix.mockResolvedValue(undefined);
});

describe('signed key-material storage', () => {
  it('stores only the signed transaction and re-derives the same keys', async () => {
    const wallet = Keypair.random();
    const signTransaction = vi.fn(async (xdr: string) => {
      const transaction = new Transaction(xdr, Networks.TESTNET);
      transaction.sign(wallet);
      return transaction.toEnvelope().toXDR('base64');
    });

    const first = await deriveAndSaveKeys(
      wallet.publicKey(),
      config,
      signTransaction,
    );

    expect(storage.setAccountBoundJson).toHaveBeenCalledOnce();
    const [collection, account, stored] =
      storage.setAccountBoundJson.mock.calls[0];
    expect(collection).toBe('key-material:testnet:1');
    expect(account).toBe(wallet.publicKey());
    expect(stored).toEqual({
      signedTransactionXdr: expect.any(String),
    });
    expect(stored).not.toHaveProperty('signingPrivateKey');
    expect(stored).not.toHaveProperty('encryptionPrivateKey');
    expect(storage.deleteSecureRecordsWithPrefix).toHaveBeenCalledWith('keys:');

    storage.getAccountBoundJson.mockResolvedValue(stored);
    const restored = await loadKeys(wallet.publicKey(), config);

    expect(bytesToBase64(restored!.signingPublicKey)).toBe(
      bytesToBase64(first.signingPublicKey),
    );
    expect(bytesToBase64(restored!.signingPrivateKey)).toBe(
      bytesToBase64(first.signingPrivateKey),
    );
    expect(bytesToBase64(restored!.encryptionPublicKey)).toBe(
      bytesToBase64(first.encryptionPublicKey),
    );
    expect(bytesToBase64(restored!.encryptionPrivateKey)).toBe(
      bytesToBase64(first.encryptionPrivateKey),
    );
    expect(signTransaction).toHaveBeenCalledOnce();
  });
});
