import sodium from 'libsodium-wrappers-sumo';
import {
  Account,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { base64ToBytes, bytesToBase64, bytesToHex, utf8 } from '@/lib/encoding';
import { deleteSecureRecord, getSecureJson, setSecureJson } from '@/lib/secure-storage';
import type { AuthConfig, DerivedKeys } from '@/types';

export type SignTransaction = (
  xdr: string,
  options?: { network: string },
) => Promise<unknown>;

const SIGNING_TIMEOUT_MS = 60_000;

function asBuffer(value: Uint8Array): Buffer {
  return value as unknown as Buffer;
}

function signedXdr(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    for (const field of [
      'signedTxXdr',
      'signedTransactionXdr',
      'signedXDR',
      'signedXdr',
      'xdr',
      'result',
    ]) {
      if (typeof record[field] === 'string') return record[field];
    }
  }
  throw new Error('The wallet did not return a signed transaction.');
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(
      () => reject(new Error('The wallet signing request timed out. Please try again.')),
      SIGNING_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        globalThis.clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

export function buildKdfTransaction(
  walletAddress: string,
  networkPassphrase: string,
): Transaction {
  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new Error('Sign in with a regular Stellar G account.');
  }
  return new TransactionBuilder(new Account(walletAddress, '-1'), {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      Operation.manageData({
        name: 'beseen_kdf_v1',
        value: 'beseen.fi/key-derivation/v1',
      }),
    )
    .setTimeout(0)
    .build();
}

async function hkdf32(signature: Uint8Array, salt: string, info: string) {
  const material = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(signature),
    'HKDF',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: Uint8Array.from(utf8(salt)),
      info: Uint8Array.from(utf8(info)),
    },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function deriveKeys(
  walletAddress: string,
  config: AuthConfig,
  signTransaction: SignTransaction,
): Promise<DerivedKeys> {
  const expected = buildKdfTransaction(walletAddress, config.networkPassphrase);
  const response = await withTimeout(
    signTransaction(expected.toEnvelope().toXDR('base64'), {
      network: config.networkPassphrase,
    }),
  );
  const parsed = TransactionBuilder.fromXDR(signedXdr(response), config.networkPassphrase);
  if (!(parsed instanceof Transaction)) throw new Error('The wallet returned an unsupported transaction.');
  if (parsed.signatures.length !== 1) throw new Error('The key transaction must have exactly one signature.');
  if (parsed.source !== walletAddress.toUpperCase()) throw new Error('The signed transaction source is incorrect.');
  if (bytesToHex(new Uint8Array(parsed.hash())) !== bytesToHex(new Uint8Array(expected.hash()))) {
    throw new Error('The wallet returned a modified key transaction.');
  }
  if (
    parsed.sequence !== '0' ||
    parsed.fee !== '100' ||
    parsed.operations.length !== 1 ||
    parsed.memo.type !== 'none' ||
    (parsed.timeBounds?.minTime ?? '0') !== '0' ||
    (parsed.timeBounds?.maxTime ?? '0') !== '0'
  ) {
    throw new Error('The signed key transaction failed local validation.');
  }
  const operation = parsed.operations[0];
  if (
    operation.type !== 'manageData' ||
    operation.source !== undefined ||
    operation.name !== 'beseen_kdf_v1' ||
    new TextDecoder().decode(operation.value ?? new Uint8Array()) !==
      'beseen.fi/key-derivation/v1'
  ) {
    throw new Error('The signed key transaction operation is incorrect.');
  }
  const signature = new Uint8Array(parsed.signatures[0].signature());
  if (signature.length !== 64) throw new Error('The wallet signature has an invalid length.');
  const verifier = (await import('@stellar/stellar-sdk')).Keypair.fromPublicKey(walletAddress);
  if (!verifier.verify(asBuffer(parsed.hash()), asBuffer(signature))) {
    throw new Error('The key transaction was signed by a different Stellar account.');
  }

  await sodium.ready;
  const signingSeed = await hkdf32(
    signature,
    config.keyDerivation.kdf.salt,
    config.keyDerivation.kdf.signingInfo,
  );
  const encryptionSeed = await hkdf32(
    signature,
    config.keyDerivation.kdf.salt,
    config.keyDerivation.kdf.encryptionInfo,
  );
  signature.fill(0);
  try {
    const signing = sodium.crypto_sign_seed_keypair(signingSeed);
    const encryption = sodium.crypto_box_seed_keypair(encryptionSeed);
    return {
      signingPublicKey: new Uint8Array(signing.publicKey),
      signingPrivateKey: new Uint8Array(signing.privateKey),
      encryptionPublicKey: new Uint8Array(encryption.publicKey),
      encryptionPrivateKey: new Uint8Array(encryption.privateKey),
    };
  } finally {
    signingSeed.fill(0);
    encryptionSeed.fill(0);
  }
}

const keyRecordId = (wallet: string, network: string, version: number) =>
  `keys:${wallet.toUpperCase()}:${network}:${version}`;

type StoredKeys = {
  signingPublicKey: string;
  signingPrivateKey: string;
  encryptionPublicKey: string;
  encryptionPrivateKey: string;
};

export async function saveKeys(
  wallet: string,
  config: AuthConfig,
  keys: DerivedKeys,
): Promise<void> {
  await setSecureJson(keyRecordId(wallet, config.stellarNetwork, config.keyDerivation.version), {
    signingPublicKey: bytesToBase64(keys.signingPublicKey),
    signingPrivateKey: bytesToBase64(keys.signingPrivateKey),
    encryptionPublicKey: bytesToBase64(keys.encryptionPublicKey),
    encryptionPrivateKey: bytesToBase64(keys.encryptionPrivateKey),
  } satisfies StoredKeys);
}

export async function loadKeys(wallet: string, config: AuthConfig): Promise<DerivedKeys | null> {
  const stored = await getSecureJson<StoredKeys>(
    keyRecordId(wallet, config.stellarNetwork, config.keyDerivation.version),
  );
  if (!stored) return null;
  try {
    return {
      signingPublicKey: base64ToBytes(stored.signingPublicKey, 32),
      signingPrivateKey: base64ToBytes(stored.signingPrivateKey, 64),
      encryptionPublicKey: base64ToBytes(stored.encryptionPublicKey, 32),
      encryptionPrivateKey: base64ToBytes(stored.encryptionPrivateKey, 32),
    };
  } catch {
    return null;
  }
}

export async function forgetKeys(wallet: string, config: AuthConfig): Promise<void> {
  await deleteSecureRecord(keyRecordId(wallet, config.stellarNetwork, config.keyDerivation.version));
}

export function serializeLoginProof(walletAddress: string, requestId: string, issuedAt: string): string {
  return [
    'BeSeen Login',
    'Version: 1',
    `Wallet Address: ${walletAddress.toUpperCase()}`,
    `Request ID: ${requestId.toLowerCase()}`,
    `Issued At: ${new Date(issuedAt).toISOString()}`,
  ].join('\n');
}

export async function signBytes(message: Uint8Array, privateKey: Uint8Array): Promise<string> {
  await sodium.ready;
  return bytesToBase64(sodium.crypto_sign_detached(message, privateKey));
}

export async function verifyBytes(
  message: Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string,
): Promise<boolean> {
  await sodium.ready;
  try {
    return sodium.crypto_sign_verify_detached(
      base64ToBytes(signatureBase64, 64),
      message,
      base64ToBytes(publicKeyBase64, 32),
    );
  } catch {
    return false;
  }
}
