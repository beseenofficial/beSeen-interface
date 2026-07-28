"use client";

import sodium from "libsodium-wrappers-sumo";
import {
  getSecureJson,
  hasSecureRecord,
  putSecureJson,
} from "@/lib/secure-storage";
import { STELLAR_NETWORK_PASSPHRASE } from "@/lib/blux-signing";
import type { AuthClientConfig, PublicUserKeys } from "@/types";

const utf8 = (value: string) => new TextEncoder().encode(value);
const identityRecordId = (walletAddress: string) =>
  `identity:${walletAddress.trim().toUpperCase()}:sep10:v1`;

export type LocalBeSeenKeys = {
  derivationVersion: 1;
  masterSecret: Uint8Array;
  signing: { publicKey: Uint8Array; privateKey: Uint8Array };
  encryption: { publicKey: Uint8Array; privateKey: Uint8Array };
};

type StoredLocalBeSeenKeys = {
  derivationVersion: 1;
  masterSecret: string;
  signing: { publicKey: string; privateKey: string };
  encryption: { publicKey: string; privateKey: string };
};

export function fromBase64(value: string): Uint8Array {
  const decoded = sodium.from_base64(
    value,
    sodium.base64_variants.ORIGINAL,
  );
  const canonical = sodium.to_base64(
    decoded,
    sodium.base64_variants.ORIGINAL,
  );
  if (canonical !== value) throw new Error("NON_CANONICAL_BASE64");
  return decoded;
}

export function toBase64(value: Uint8Array): string {
  return sodium.to_base64(value, sodium.base64_variants.ORIGINAL);
}

export function assertBeSeenProtocol(config: AuthClientConfig) {
  const { protocol, keyDerivation: key } = config;
  if (
    protocol.authenticationStandard !== "SEP-10" ||
    protocol.challengeFormat !== "stellar-transaction-xdr" ||
    protocol.walletMethod !== "signTransaction" ||
    protocol.stellarNetwork !== "testnet" ||
    protocol.networkPassphrase !== STELLAR_NETWORK_PASSPHRASE ||
    protocol.authDomain !== "beseen.app" ||
    protocol.transactionSubmissionRequired !== false ||
    key.version !== 1 ||
    key.source !== "CLIENT_GENERATED" ||
    key.kdf.name !== "HKDF-SHA-256" ||
    key.kdf.input !== "CLIENT-RANDOM-32-BYTE-MASTER-SECRET" ||
    key.kdf.inputEncoding !== "raw-bytes" ||
    key.kdf.seedLengthBytes !== 32 ||
    key.signingAlgorithm !== "Ed25519" ||
    key.encryptionAlgorithm !== "X25519"
  ) {
    throw new Error(
      protocol.stellarNetwork !== "testnet"
        ? "BeSeen API is not configured for Testnet. Set STELLAR_NETWORK=testnet on the API and restart it."
        : "UNSUPPORTED_PROTOCOL",
    );
  }
}

async function hkdfSeed(
  sourceKey: CryptoKey,
  salt: string,
  info: string,
): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8(salt),
      info: utf8(info),
    },
    sourceKey,
    256,
  );
  return new Uint8Array(bits);
}

export async function deriveBeSeenKeys(
  masterSecret: Uint8Array,
  config: AuthClientConfig,
): Promise<LocalBeSeenKeys> {
  await sodium.ready;
  assertBeSeenProtocol(config);
  if (masterSecret.length !== 32) {
    throw new Error("The BeSeen master secret must contain exactly 32 bytes.");
  }
  const masterSecretCopy = Uint8Array.from(masterSecret);

  const sourceKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(masterSecretCopy).buffer,
    "HKDF",
    false,
    ["deriveBits"],
  );
  const [signingSeed, encryptionSeed] = await Promise.all([
    hkdfSeed(
      sourceKey,
      config.keyDerivation.kdf.salt,
      config.keyDerivation.kdf.signingInfo,
    ),
    hkdfSeed(
      sourceKey,
      config.keyDerivation.kdf.salt,
      config.keyDerivation.kdf.encryptionInfo,
    ),
  ]);
  const signing = sodium.crypto_sign_seed_keypair(signingSeed);
  const encryption = sodium.crypto_box_seed_keypair(encryptionSeed);
  signingSeed.fill(0);
  encryptionSeed.fill(0);

  return {
    derivationVersion: 1,
    masterSecret: masterSecretCopy,
    signing: {
      publicKey: new Uint8Array(signing.publicKey),
      privateKey: new Uint8Array(signing.privateKey),
    },
    encryption: {
      publicKey: new Uint8Array(encryption.publicKey),
      privateKey: new Uint8Array(encryption.privateKey),
    },
  };
}

export async function generateBeSeenKeys(
  config: AuthClientConfig,
): Promise<LocalBeSeenKeys> {
  const masterSecret = crypto.getRandomValues(new Uint8Array(32));
  try {
    return await deriveBeSeenKeys(masterSecret, config);
  } finally {
    masterSecret.fill(0);
  }
}

export async function storeLocalBeSeenKeys(
  walletAddress: string,
  keys: LocalBeSeenKeys,
): Promise<void> {
  await sodium.ready;
  const stored: StoredLocalBeSeenKeys = {
    derivationVersion: 1,
    masterSecret: toBase64(keys.masterSecret),
    signing: {
      publicKey: toBase64(keys.signing.publicKey),
      privateKey: toBase64(keys.signing.privateKey),
    },
    encryption: {
      publicKey: toBase64(keys.encryption.publicKey),
      privateKey: toBase64(keys.encryption.privateKey),
    },
  };
  await putSecureJson(identityRecordId(walletAddress), stored);
}

export async function deriveAndStoreBeSeenKeys(
  walletAddress: string,
  masterSecret: Uint8Array,
  config: AuthClientConfig,
): Promise<LocalBeSeenKeys> {
  const keys = await deriveBeSeenKeys(masterSecret, config);
  try {
    await storeLocalBeSeenKeys(walletAddress, keys);
    return keys;
  } catch (cause) {
    keys.signing.privateKey.fill(0);
    keys.encryption.privateKey.fill(0);
    keys.masterSecret.fill(0);
    throw cause;
  }
}

export async function loadLocalBeSeenKeys(
  walletAddress: string,
): Promise<LocalBeSeenKeys | null> {
  await sodium.ready;
  const stored = await getSecureJson<StoredLocalBeSeenKeys>(
    identityRecordId(walletAddress),
  );
  if (!stored) return null;
  const keys: LocalBeSeenKeys = {
    derivationVersion: stored.derivationVersion,
    masterSecret: fromBase64(stored.masterSecret),
    signing: {
      publicKey: fromBase64(stored.signing.publicKey),
      privateKey: fromBase64(stored.signing.privateKey),
    },
    encryption: {
      publicKey: fromBase64(stored.encryption.publicKey),
      privateKey: fromBase64(stored.encryption.privateKey),
    },
  };
  if (
    keys.derivationVersion !== 1 ||
    keys.masterSecret.length !== 32 ||
    keys.signing.publicKey.length !== 32 ||
    keys.signing.privateKey.length !== 64 ||
    keys.encryption.publicKey.length !== 32 ||
    keys.encryption.privateKey.length !== 32
  ) {
    clearLocalBeSeenKeys(keys);
    throw new Error("Stored BeSeen identity keys are invalid.");
  }
  return keys;
}

export function localPublicKeys(keys: LocalBeSeenKeys) {
  return {
    derivationVersion: keys.derivationVersion,
    signingPublicKey: toBase64(keys.signing.publicKey),
    encryptionPublicKey: toBase64(keys.encryption.publicKey),
  };
}

export function clearLocalBeSeenKeys(keys: LocalBeSeenKeys): void {
  keys.masterSecret.fill(0);
  keys.signing.privateKey.fill(0);
  keys.encryption.privateKey.fill(0);
}

export function keysMatchServer(
  keys: LocalBeSeenKeys,
  serverKeys: PublicUserKeys,
): boolean {
  return (
    serverKeys.derivationVersion === keys.derivationVersion &&
    serverKeys.signing.algorithm === "Ed25519" &&
    serverKeys.encryption.algorithm === "X25519" &&
    serverKeys.signing.publicKey === toBase64(keys.signing.publicKey) &&
    serverKeys.encryption.publicKey === toBase64(keys.encryption.publicKey)
  );
}

export function hasLocalBeSeenKeys(walletAddress: string): Promise<boolean> {
  return hasSecureRecord(identityRecordId(walletAddress));
}
