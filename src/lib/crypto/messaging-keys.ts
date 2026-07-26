"use client";

import sodium from "libsodium-wrappers";
import { storeEncryptedPrivateKey } from "./key-storage";

const SALT_LABEL = "beseen.fi/messenger/key-derivation/v1";
const INFO = "beseen-messenger-x25519-keypair-v1";

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalizeSignature(signature: unknown): Uint8Array {
  const candidate =
    typeof signature === "string"
      ? signature
      : signature &&
          typeof signature === "object" &&
          "result" in signature &&
          typeof signature.result === "string"
        ? signature.result
        : null;
  if (!candidate) throw new Error("The wallet returned an unsupported signature.");

  const value = candidate.trim();
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (/^[a-fA-F0-9]+$/.test(hex) && hex.length % 2 === 0) {
    return Uint8Array.from(hex.match(/.{2}/g)!, (byte) => parseInt(byte, 16));
  }
  try {
    return decodeBase64(value);
  } catch {
    return new TextEncoder().encode(value);
  }
}

export async function deriveAndStoreMessagingKeyPair(
  signature: unknown,
  ownerId: string,
) {
  const signatureBytes = normalizeSignature(signature);
  const salt = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SALT_LABEL),
  );
  const material = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(signatureBytes).buffer,
    "HKDF",
    false,
    ["deriveBits"],
  );
  const seedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: new TextEncoder().encode(INFO),
    },
    material,
    256,
  );
  const seed = new Uint8Array(seedBits);
  await sodium.ready;
  const keyPair = sodium.crypto_box_seed_keypair(seed);
  await storeEncryptedPrivateKey(ownerId, keyPair.privateKey);
  seed.fill(0);
  const publicKey = sodium.to_base64(
    keyPair.publicKey,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
  keyPair.privateKey.fill(0);
  return { publicKey };
}
