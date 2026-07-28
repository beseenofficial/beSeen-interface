import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BroadcastComposer } from '@/components/features/broadcasts/broadcast-composer';
import { deriveBeSeenKeys, toBase64 } from '@/lib/crypto/messaging-keys';
import { validateUsername } from '@/lib/onboarding';
import {
  BLUX_LOGIN_METHODS,
  STELLAR_NETWORK,
  STELLAR_NETWORK_PASSPHRASE,
} from '@/lib/blux-signing';
import type { AuthClientConfig } from '@/types';

const masterSecret = Uint8Array.from({ length: 32 }, (_, index) => index);

const testnetConfig: AuthClientConfig = {
  protocol: {
    authenticationStandard: 'SEP-10',
    challengeFormat: 'stellar-transaction-xdr',
    walletMethod: 'signTransaction',
    stellarNetwork: 'testnet',
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    authDomain: 'beseen.app',
    serverSigningPublicKey:
      'GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57',
    transactionSubmissionRequired: false,
    challengeTtlSeconds: 300,
    accessTokenTtlSeconds: 900,
  },
  keyDerivation: {
    version: 1,
    source: 'CLIENT_GENERATED',
    kdf: {
      name: 'HKDF-SHA-256',
      input: 'CLIENT-RANDOM-32-BYTE-MASTER-SECRET',
      inputEncoding: 'raw-bytes',
      salt: 'beseen.app/key-derivation/v1',
      seedLengthBytes: 32,
      signingInfo: 'beseen.app/ed25519-signing-key/v1',
      encryptionInfo: 'beseen.app/x25519-encryption-key/v1',
    },
    signingAlgorithm: 'Ed25519',
    encryptionAlgorithm: 'X25519',
  },
};

describe('Stellar and Blux contract', () => {
  it('supports only Testnet and the requested login methods', () => {
    expect(STELLAR_NETWORK).toBe('testnet');
    expect(BLUX_LOGIN_METHODS).toEqual(['wallet', 'email', 'google']);
  });

  it('derives deterministic independent Ed25519 and X25519 public keys', async () => {
    const first = await deriveBeSeenKeys(masterSecret, testnetConfig);
    const second = await deriveBeSeenKeys(masterSecret, testnetConfig);
    expect(toBase64(first.signing.publicKey)).toBe(
      toBase64(second.signing.publicKey),
    );
    expect(toBase64(first.encryption.publicKey)).toBe(
      toBase64(second.encryption.publicKey),
    );
    expect(toBase64(first.signing.publicKey)).not.toBe(
      toBase64(first.encryption.publicKey),
    );
  });

  it('stops when the API reports Public network', async () => {
    await expect(
      deriveBeSeenKeys(masterSecret, {
        ...testnetConfig,
        protocol: {
          ...testnetConfig.protocol,
          stellarNetwork: 'public',
        },
      }),
    ).rejects.toThrow('not configured for Testnet');
  });
});

describe('profile validation', () => {
  it('matches the API username rules', () => {
    expect(validateUsername('Bad Name')).toBe(false);
    expect(validateUsername('12_creator')).toBe(true);
    expect(validateUsername('mo')).toBe(false);
    expect(validateUsername('administrator')).toBe(false);
    expect(validateUsername('mohammad_m')).toBe(true);
  });
});

describe('broadcast composer', () => {
  it('publishes via the explicit action and clears the composer', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    render(<BroadcastComposer publish={publish} />);
    const textbox = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(textbox, {
      target: { value: 'A useful encrypted update' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt & publish' }));
    await waitFor(() =>
      expect(publish).toHaveBeenCalledWith('A useful encrypted update'),
    );
    expect(textbox).toHaveValue('');
  });

  it('does not publish on plain Enter', () => {
    const publish = vi.fn();
    render(<BroadcastComposer publish={publish} />);
    const textbox = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(textbox, { target: { value: 'Two\nlines' } });
    fireEvent.keyDown(textbox, { key: 'Enter' });
    expect(publish).not.toHaveBeenCalled();
  });
});
