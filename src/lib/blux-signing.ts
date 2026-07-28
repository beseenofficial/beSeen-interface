import { Networks, Transaction, xdr } from '@stellar/stellar-sdk';
import type { AuthClientConfig, ChallengeResult } from '@/types';

export const STELLAR_NETWORK = 'testnet' as const;
export const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;
export const BLUX_LOGIN_METHODS = ['wallet', 'email', 'google'] as const;

type BluxSignTransaction = (
  transactionXdr: string,
  networkPassphrase: string,
) => Promise<unknown>;

const SIGNING_TIMEOUT_MS = 45_000;

/** Returns the signed XDR regardless of which supported Blux result shape was used. */
function signedXdrFromBlux(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const result = value as Record<string, unknown>;
    for (const key of [
      'result',
      'signedTransactionXdr',
      'signedTxXdr',
      'signedXdr',
      'signed_envelope_xdr',
      'xdr',
    ]) {
      if (typeof result[key] === 'string') return result[key];
    }
  }
  throw new Error('Blux did not return a signed transaction.');
}

/** Stops a wallet prompt from leaving the authentication screen stuck forever. */
async function withSigningTimeout(operation: Promise<unknown>) {
  return new Promise<unknown>((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new Error('The Blux signing request timed out. Please try again.'),
        ),
      SIGNING_TIMEOUT_MS,
    );
    operation.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        window.clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

/**
 * Checks that the backend challenge belongs to the connected Blux account.
 * SEP-10 uses the BeSeen server as transaction source and the user's address
 * as the source of the first manage-data operation.
 */
function validateChallenge(
  challenge: ChallengeResult,
  config: AuthClientConfig,
  walletAddress: string,
): Transaction {
  if (
    challenge.authenticationStandard !== 'SEP-10' ||
    challenge.stellarNetwork !== STELLAR_NETWORK ||
    challenge.networkPassphrase !== STELLAR_NETWORK_PASSPHRASE ||
    challenge.networkPassphrase !== config.protocol.networkPassphrase ||
    challenge.serverSigningPublicKey !==
      config.protocol.serverSigningPublicKey ||
    challenge.homeDomain !== config.protocol.authDomain
  ) {
    throw new Error(
      'The sign-in request does not match the current BeSeen settings.',
    );
  }
  if (Date.parse(challenge.expiresAt) <= Date.now()) {
    throw new Error('The sign-in request expired. Please try again.');
  }

  try {
    if (challenge.transactionXdr !== challenge.transactionXdr.trim()) {
      throw new Error('NON_CANONICAL_XDR');
    }
    const transaction = new Transaction(
      challenge.transactionXdr,
      challenge.networkPassphrase,
    );
    const clientOperation = transaction.operations[0];
    if (
      transaction.toXDR() !== challenge.transactionXdr ||
      transaction.source !== challenge.serverSigningPublicKey ||
      clientOperation?.type !== 'manageData' ||
      clientOperation.source?.toUpperCase() !== walletAddress.toUpperCase()
    ) {
      throw new Error('WRONG_SEP10_SIGNER');
    }
    return transaction;
  } catch (cause) {
    throw new Error(
      'This sign-in request was created for a different Stellar account. Reconnect Blux and try again.',
      { cause },
    );
  }
}

/** Ensures Blux added a signature without changing the backend transaction. */
function validateSignedXdr(
  signedXdr: string,
  original: Transaction,
  networkPassphrase: string,
): string {
  try {
    if (signedXdr !== signedXdr.trim() || signedXdr.length > 16_384) {
      throw new Error('NON_CANONICAL_XDR');
    }
    const signed = new Transaction(signedXdr, networkPassphrase);
    const originalEnvelope = xdr.TransactionEnvelope.fromXDR(
      original.toXDR(),
      'base64',
    );
    const signedEnvelope = xdr.TransactionEnvelope.fromXDR(signedXdr, 'base64');
    if (
      signed.toXDR() !== signedXdr ||
      originalEnvelope.v1().tx().toXDR('base64') !==
        signedEnvelope.v1().tx().toXDR('base64') ||
      signedEnvelope.v1().signatures().length <=
        originalEnvelope.v1().signatures().length
    ) {
      throw new Error('INVALID_BLUX_SIGNATURE');
    }
    return signedXdr;
  } catch (cause) {
    throw new Error('Blux returned an invalid wallet approval.', { cause });
  }
}

/** Validates, signs once with Blux, and returns the untouched signed SEP-10 XDR. */
export async function signSep10Challenge(input: {
  walletAddress: string;
  challenge: ChallengeResult;
  config: AuthClientConfig;
  signTransaction: BluxSignTransaction;
}): Promise<string> {
  const transaction = validateChallenge(
    input.challenge,
    input.config,
    input.walletAddress,
  );
  const result = await withSigningTimeout(
    input.signTransaction(
      input.challenge.transactionXdr,
      input.challenge.networkPassphrase,
    ),
  );
  return validateSignedXdr(
    signedXdrFromBlux(result),
    transaction,
    input.challenge.networkPassphrase,
  );
}

export { validateChallenge as assertSep10Challenge };
