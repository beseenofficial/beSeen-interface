// @vitest-environment node
// (Pure crypto — no DOM. Under jsdom, vitest's web transform loads
// stellar-sdk's browser build whose Buffer shim fails noble's strict
// Uint8Array check; the node environment matches how the SDK actually
// resolves in the browser bundle.)

import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';

// The blux module bundles the React provider; the crypto under test never
// touches it, so stub the SDK out entirely.
vi.mock('@bluxcc/react', () => ({
  BluxProvider: ({ children }: { children: unknown }) => children,
  useBlux: () => ({}),
  networks: { testnet: 'Test SDF Network ; September 2015' },
}));

import { buildChallenge, deriveKeypair, signForApi } from '@/lib/blux';

/** A wallet that behaves: signs exactly what it was given. */
function honestWallet(keypair: Keypair) {
  return async (xdr: string) => {
    const transaction = new Transaction(xdr, Networks.TESTNET);
    transaction.sign(keypair);
    return transaction.toEnvelope().toXDR('base64');
  };
}

describe('buildChallenge', () => {
  const account = Keypair.random().publicKey();

  it('is byte-for-byte identical on every call', () => {
    const first = buildChallenge(account).toEnvelope().toXDR('base64');
    const second = buildChallenge(account).toEnvelope().toXDR('base64');
    expect(first).toBe(second);
  });

  it('can never be submitted (sequence 0, no timebound expiry)', () => {
    const challenge = buildChallenge(account);
    expect(challenge.sequence).toBe('0');
    expect(challenge.timeBounds?.maxTime ?? '0').toBe('0');
  });

  it('ties the challenge to the user via the manageData operation', () => {
    const operation = buildChallenge(account).operations[0];
    expect(operation.type).toBe('manageData');
    expect(operation.source).toBe(account);
  });

  // Regression: Blux's API signer rejects transactions whose source is not
  // the user's own wallet ("transaction source account … does not match the
  // user's wallet"). The challenge must always be sourced by the signer.
  it('is sourced by the signing account itself — wallets refuse anything else', () => {
    expect(buildChallenge(account).source).toBe(account);
  });

  it('stays deterministic per account but differs between accounts', () => {
    const other = Keypair.random().publicKey();
    const forAccount = buildChallenge(account).toEnvelope().toXDR('base64');
    const forOther = buildChallenge(other).toEnvelope().toXDR('base64');
    expect(forAccount).toBe(buildChallenge(account).toEnvelope().toXDR('base64'));
    expect(forAccount).not.toBe(forOther);
  });
});

describe('deriveKeypair', () => {
  it('derives the same keypair on every sign-in', async () => {
    const wallet = Keypair.random();
    const first = await deriveKeypair(wallet.publicKey(), honestWallet(wallet));
    const second = await deriveKeypair(wallet.publicKey(), honestWallet(wallet));

    expect(first.publicKey()).toBe(second.publicKey());
    expect(first.secret()).toBe(second.secret());
    // And it is a distinct keypair, not the wallet itself.
    expect(first.publicKey()).not.toBe(wallet.publicKey());
  });

  it('derives different keypairs for different accounts', async () => {
    const walletA = Keypair.random();
    const walletB = Keypair.random();
    const a = await deriveKeypair(walletA.publicKey(), honestWallet(walletA));
    const b = await deriveKeypair(walletB.publicKey(), honestWallet(walletB));
    expect(a.publicKey()).not.toBe(b.publicKey());
  });

  it('rejects a wallet that returns a modified transaction', async () => {
    const wallet = Keypair.random();
    const tampered = buildChallenge(Keypair.random().publicKey());
    tampered.sign(wallet);
    await expect(
      deriveKeypair(wallet.publicKey(), async () =>
        tampered.toEnvelope().toXDR('base64'),
      ),
    ).rejects.toThrow(/modified transaction/i);
  });

  it('rejects a signature from a different account', async () => {
    const wallet = Keypair.random();
    const impostor = Keypair.random();
    await expect(
      deriveKeypair(wallet.publicKey(), honestWallet(impostor)),
    ).rejects.toThrow(/different account/i);
  });

  it('rejects contract addresses (no ed25519 key to verify against)', async () => {
    const contract =
      'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
    await expect(
      deriveKeypair(contract, honestWallet(Keypair.random())),
    ).rejects.toThrow(/not supported/i);
  });
});

describe('signForApi', () => {
  it('produces a signature the server can verify with the derived public key', () => {
    const derived = Keypair.random();
    const { derivedPublicKey, signatureBase64 } = signForApi(
      derived,
      'beseen-api-auth-v1|example-payload',
    );

    const verifier = Keypair.fromPublicKey(derivedPublicKey);
    const message = Buffer.from('beseen-api-auth-v1|example-payload', 'utf8');
    const signature = Buffer.from(signatureBase64, 'base64');
    expect(verifier.verify(message, signature)).toBe(true);
  });
});
