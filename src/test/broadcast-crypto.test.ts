// @vitest-environment node
// (Same reason as derive-keys.test.ts: stellar-sdk's browser build misbehaves
// under vitest's jsdom transform; this module is pure crypto with no DOM.)

import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { decryptBroadcast, encryptForRecipient } from '@/lib/broadcast-crypto';

describe('broadcast crypto', () => {
  it('round-trips a message encrypted to a derived public key', async () => {
    const recipient = Keypair.random();
    const payload = await encryptForRecipient(
      recipient.publicKey(),
      'hello, encrypted world 🎉',
    );

    expect(payload).not.toContain('hello');
    await expect(decryptBroadcast(recipient, payload)).resolves.toBe(
      'hello, encrypted world 🎉',
    );
  });

  it('cannot be decrypted by anyone but the intended recipient', async () => {
    const recipient = Keypair.random();
    const eavesdropper = Keypair.random();
    const payload = await encryptForRecipient(recipient.publicKey(), 'secret');

    await expect(decryptBroadcast(eavesdropper, payload)).rejects.toThrow();
  });

  it('fans out per recipient: everyone decrypts their own copy only', async () => {
    const sender = Keypair.random();
    const follower = Keypair.random();
    const message = 'broadcast for my followers';

    const copies = await Promise.all(
      [sender, follower].map(async (kp) => ({
        recipientPublicKey: kp.publicKey(),
        ciphertext: await encryptForRecipient(kp.publicKey(), message),
      })),
    );

    await expect(
      decryptBroadcast(sender, copies[0].ciphertext),
    ).resolves.toBe(message);
    await expect(
      decryptBroadcast(follower, copies[1].ciphertext),
    ).resolves.toBe(message);
    // Crossed copies fail: each ciphertext is bound to one key.
    await expect(
      decryptBroadcast(sender, copies[1].ciphertext),
    ).rejects.toThrow();
  });

  it('rejects tampered ciphertext (GCM authentication)', async () => {
    const recipient = Keypair.random();
    const payload = await encryptForRecipient(recipient.publicKey(), 'intact');

    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...Array.from(bytes)));

    await expect(decryptBroadcast(recipient, tampered)).rejects.toThrow();
  });

  it('never produces the same payload twice (fresh ephemeral key + IV)', async () => {
    const recipient = Keypair.random();
    const first = await encryptForRecipient(recipient.publicKey(), 'same text');
    const second = await encryptForRecipient(recipient.publicKey(), 'same text');
    expect(first).not.toBe(second);
  });

  it('rejects invalid recipient keys', async () => {
    await expect(encryptForRecipient('not-a-key', 'x')).rejects.toThrow(
      /invalid recipient/i,
    );
  });
});
