import {
  ApiError,
  auraApi,
  type AuraPurchaseRegistrationPayload,
} from '@/lib/api';
import {
  deleteSecureRecord,
  getSecureJson,
  setSecureJson,
} from '@/lib/secure-storage';
import type { AuraPurchaseRegistrationResult } from '@/types';

/**
 * A `buy_aura` transaction that succeeded on-chain but whose server
 * registration has not reached `confirmed` yet. The exact registration
 * payload is preserved so confirmation retries stay idempotent — the client
 * never submits a second contract transaction for the same purchase.
 */
export type PendingAuraPurchase = {
  subjectUsername: string;
  payload: AuraPurchaseRegistrationPayload;
  createdAt: string;
};

export type AuraPurchaseConfirmation =
  | { state: 'confirmed'; result: AuraPurchaseRegistrationResult }
  | { state: 'pending'; result: AuraPurchaseRegistrationResult };

const recordKey = (subjectUsername: string) =>
  `aura-purchase:${subjectUsername.toLowerCase()}`;

export async function loadPendingAuraPurchase(
  subjectUsername: string,
): Promise<PendingAuraPurchase | null> {
  const record = await getSecureJson<PendingAuraPurchase>(recordKey(subjectUsername));
  if (record?.subjectUsername !== subjectUsername.toLowerCase()) return null;
  return record;
}

export async function discardPendingAuraPurchase(subjectUsername: string): Promise<void> {
  await deleteSecureRecord(recordKey(subjectUsername));
}

export async function savePendingAuraPurchase(
  purchase: PendingAuraPurchase,
): Promise<void> {
  await setSecureJson(recordKey(purchase.subjectUsername), {
    ...purchase,
    subjectUsername: purchase.subjectUsername.toLowerCase(),
  });
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const AURA_PURCHASE_CONFIRMATION_ATTEMPTS = 5;
export const AURA_PURCHASE_CONFIRMATION_BASE_DELAY_MS = 2_000;

/**
 * Registration failures that will never succeed when retried with the same
 * payload (for example a wallet mismatch or an on-chain purchase the server
 * rejected). Pending records for these are dropped; anything else (network
 * errors, 5xx) keeps the record so the user can retry manually.
 */
function isDefinitiveRegistrationFailure(cause: unknown): boolean {
  return (
    cause instanceof ApiError &&
    (cause.status === 400 ||
      cause.status === 401 ||
      cause.status === 404 ||
      cause.status === 409)
  );
}

/**
 * Registers a completed on-chain `buy_aura` transaction with the API and, when
 * the server answers HTTP 202, keeps re-submitting the identical payload with
 * bounded backoff until the purchase is confirmed or the attempt budget runs
 * out. A `pending` outcome is not a failure: the registration stays persisted
 * and can be resumed later or retried manually.
 */
export async function registerAndConfirmAuraPurchase(
  subjectUsername: string,
  payload: AuraPurchaseRegistrationPayload,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onPending?: (attempt: number, maxAttempts: number) => void;
  } = {},
): Promise<AuraPurchaseConfirmation> {
  const maxAttempts = options.maxAttempts ?? AURA_PURCHASE_CONFIRMATION_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? AURA_PURCHASE_CONFIRMATION_BASE_DELAY_MS;

  await savePendingAuraPurchase({
    subjectUsername,
    payload,
    createdAt: new Date().toISOString(),
  });

  let lastResult: AuraPurchaseRegistrationResult | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { result, status } = await auraApi.registerPurchase(subjectUsername, payload);
      lastResult = result;
      if (status === 200 || status === 201 || result.purchase.status === 'confirmed') {
        await discardPendingAuraPurchase(subjectUsername);
        return { state: 'confirmed', result };
      }
      // HTTP 202: registration stored, server confirmation still pending.
      if (attempt < maxAttempts) {
        options.onPending?.(attempt, maxAttempts);
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    } catch (cause) {
      if (isDefinitiveRegistrationFailure(cause)) {
        await discardPendingAuraPurchase(subjectUsername);
      }
      throw cause;
    }
  }

  if (!lastResult) {
    throw new Error('The purchase registration did not reach the server.');
  }
  return { state: 'pending', result: lastResult };
}
