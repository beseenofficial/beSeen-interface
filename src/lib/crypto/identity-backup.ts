"use client";

import { fromBase64, toBase64 } from "@/lib/crypto/messaging-keys";

const BACKUP_FORMAT = "beseen-identity-backup";
const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000;

type EncryptedIdentityBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  walletAddress: string;
  encryption: {
    algorithm: "AES-256-GCM";
    kdf: "PBKDF2-HMAC-SHA-256";
    iterations: typeof PBKDF2_ITERATIONS;
    salt: string;
    iv: string;
    ciphertext: string;
  };
};

const utf8 = (value: string) => new TextEncoder().encode(value);
const canonicalWallet = (walletAddress: string) =>
  walletAddress.trim().toUpperCase();
const backupAad = (walletAddress: string) =>
  utf8(`${BACKUP_FORMAT}:v${BACKUP_VERSION}:${canonicalWallet(walletAddress)}`);

async function backupKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
) {
  if (password.length < 12) {
    throw new Error("Use a backup password containing at least 12 characters.");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    utf8(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Uint8Array.from(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

export async function createEncryptedIdentityBackup(
  walletAddress: string,
  masterSecret: Uint8Array,
  password: string,
): Promise<string> {
  if (masterSecret.length !== 32) {
    throw new Error("The identity master secret must contain 32 bytes.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(password, salt, ["encrypt"]);
  const plaintext = Uint8Array.from(masterSecret);
  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: backupAad(walletAddress) },
      key,
      plaintext,
    );
    const backup: EncryptedIdentityBackup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      walletAddress: canonicalWallet(walletAddress),
      encryption: {
        algorithm: "AES-256-GCM",
        kdf: "PBKDF2-HMAC-SHA-256",
        iterations: PBKDF2_ITERATIONS,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
      },
    };
    return JSON.stringify(backup, null, 2);
  } finally {
    plaintext.fill(0);
  }
}

function parseBackup(serialized: string): EncryptedIdentityBackup {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch (cause) {
    throw new Error("The selected BeSeen identity backup is not valid JSON.", {
      cause,
    });
  }
  const backup = value as Partial<EncryptedIdentityBackup>;
  if (
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION ||
    typeof backup.walletAddress !== "string" ||
    backup.encryption?.algorithm !== "AES-256-GCM" ||
    backup.encryption.kdf !== "PBKDF2-HMAC-SHA-256" ||
    backup.encryption.iterations !== PBKDF2_ITERATIONS ||
    typeof backup.encryption.salt !== "string" ||
    typeof backup.encryption.iv !== "string" ||
    typeof backup.encryption.ciphertext !== "string"
  ) {
    throw new Error("The selected file is not a supported BeSeen identity backup.");
  }
  return backup as EncryptedIdentityBackup;
}

export async function restoreIdentityMasterSecret(
  serialized: string,
  walletAddress: string,
  password: string,
): Promise<Uint8Array> {
  const backup = parseBackup(serialized);
  if (canonicalWallet(backup.walletAddress) !== canonicalWallet(walletAddress)) {
    throw new Error("This identity backup belongs to a different Stellar account.");
  }
  try {
    const salt = fromBase64(backup.encryption.salt);
    const iv = fromBase64(backup.encryption.iv);
    const ciphertext = fromBase64(backup.encryption.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length !== 48) {
      throw new Error("INVALID_BACKUP_LENGTH");
    }
    const key = await backupKey(password, salt, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Uint8Array.from(iv),
        additionalData: backupAad(walletAddress),
      },
      key,
      Uint8Array.from(ciphertext),
    );
    const masterSecret = new Uint8Array(plaintext);
    if (masterSecret.length !== 32) {
      masterSecret.fill(0);
      throw new Error("INVALID_MASTER_SECRET_LENGTH");
    }
    return masterSecret;
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("different Stellar")) {
      throw cause;
    }
    throw new Error(
      "The backup could not be decrypted. Check the file and backup password.",
      { cause },
    );
  }
}
