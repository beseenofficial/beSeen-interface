/**
 * =============================================================================
 * End-to-end encryption for broadcasts
 * =============================================================================
 *
 * The message is encrypted in the browser, once per recipient, against each
 * recipient's DERIVED public key (the deterministic keypair from
 * `src/lib/blux.tsx`). The API/DB only ever sees ciphertext — it can never
 * read a broadcast, not even the sender's own copy.
 *
 * THE SCHEME (ECIES — the same construction as libsodium's "sealed boxes")
 *   1. Recipient keys are ed25519 (Stellar). ed25519 signs but cannot
 *      encrypt, so both sides are converted to X25519 (birational map).
 *   2. A fresh ephemeral X25519 keypair is generated per copy.
 *   3. shared  = X25519(ephemeral secret, recipient public)
 *   4. AES key = HKDF-SHA256(shared, salt = ephemeralPub ‖ recipientPub,
 *                info = "beseen|broadcast|v1")
 *   5. payload = base64( ephemeralPub(32) ‖ iv(12) ‖ AES-256-GCM ciphertext )
 *
 * Only someone holding the recipient's derived SECRET key can rebuild the
 * shared secret and decrypt — and that key never leaves the user's browser.
 * GCM authenticates the ciphertext, so tampering fails loudly.
 */

import {
  edwardsToMontgomeryPriv,
  edwardsToMontgomeryPub,
  x25519,
} from '@noble/curves/ed25519';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

const HKDF_INFO = 'beseen|broadcast|v1';
const EPHEMERAL_PUB_BYTES = 32;
const IV_BYTES = 12;

const utf8 = (value: string) => new TextEncoder().encode(value);

const toBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes)));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** shared secret + transcript → one 32-byte AES-GCM key. */
async function messageKey(
  shared: Uint8Array,
  ephemeralPub: Uint8Array,
  recipientPub: Uint8Array,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(shared),
    'HKDF',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: Uint8Array.from(concat(ephemeralPub, recipientPub)),
      info: utf8(HKDF_INFO),
    },
    material,
    256,
  );
  return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypts one copy of `plaintext` for the holder of `recipientPublicKey`
 * (a derived Stellar public key, G…). Every call uses a fresh ephemeral key
 * and IV, so encrypting the same message twice yields different payloads.
 */
export async function encryptForRecipient(
  recipientPublicKey: string,
  plaintext: string,
): Promise<string> {
  if (!StrKey.isValidEd25519PublicKey(recipientPublicKey)) {
    throw new Error(`Invalid recipient public key: ${recipientPublicKey}`);
  }
  const recipientX = edwardsToMontgomeryPub(
    StrKey.decodeEd25519PublicKey(recipientPublicKey),
  );
  const ephemeralSecret = x25519.utils.randomPrivateKey();
  const ephemeralPub = x25519.getPublicKey(ephemeralSecret);
  const shared = x25519.getSharedSecret(ephemeralSecret, recipientX);

  const key = await messageKey(shared, ephemeralPub, recipientX);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(plaintext)),
  );
  return toBase64(concat(ephemeralPub, iv, ciphertext));
}

/**
 * Decrypts a payload addressed to `keypair` (the derived keypair from
 * `useAuth()`). Throws when the payload was encrypted for someone else or
 * was tampered with.
 */
export async function decryptBroadcast(
  keypair: Keypair,
  payload: string,
): Promise<string> {
  const bytes = fromBase64(payload);
  if (bytes.length <= EPHEMERAL_PUB_BYTES + IV_BYTES) {
    throw new Error('Broadcast payload is too short.');
  }
  const ephemeralPub = bytes.slice(0, EPHEMERAL_PUB_BYTES);
  const iv = bytes.slice(EPHEMERAL_PUB_BYTES, EPHEMERAL_PUB_BYTES + IV_BYTES);
  const ciphertext = bytes.slice(EPHEMERAL_PUB_BYTES + IV_BYTES);

  // rawSecretKey() is the 32-byte ed25519 seed of the derived keypair.
  const myXSecret = edwardsToMontgomeryPriv(
    Uint8Array.from(keypair.rawSecretKey()),
  );
  const myXPub = x25519.getPublicKey(myXSecret);
  const shared = x25519.getSharedSecret(myXSecret, ephemeralPub);

  const key = await messageKey(shared, ephemeralPub, myXPub);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv) },
    key,
    Uint8Array.from(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
