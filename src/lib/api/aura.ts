import { apiRequestWithStatus } from '@/lib/api/transport';
import type { AuraPurchaseRegistrationResult } from '@/types';

/**
 * Registration payload for a completed on-chain `buy_aura` transaction.
 *
 * The exact same payload must be re-sent for idempotent confirmation retries
 * (HTTP 202): `tokenId` stays a decimal string, the addresses stay untouched,
 * and `transactionHash` is normalized to lowercase once at creation time.
 */
export type AuraPurchaseRegistrationPayload = {
  /** Contract-generated Aura token ID as a positive u64 decimal string. */
  tokenId: string;
  buyerAddress: string;
  subjectAddress: string;
  /** 64-character hexadecimal transaction hash (lowercase). */
  transactionHash: string;
};

export type AuraPurchaseRegistrationResponse = {
  result: AuraPurchaseRegistrationResult;
  /** 201 newly confirmed, 200 idempotently confirmed, 202 pending. */
  status: number;
};

export const auraApi = {
  /**
   * POST /v1/users/:username/aura/purchases
   *
   * Registers a confirmed on-chain `buy_aura` transaction so the server can
   * verify it against contract events/reads and create the Aura Follow
   * relationship plus the canonical conversation. Repeating the same payload
   * is the idempotent confirmation check while the server is pending.
   */
  async registerPurchase(
    subjectUsername: string,
    payload: AuraPurchaseRegistrationPayload,
  ): Promise<AuraPurchaseRegistrationResponse> {
    const { result, status } = await apiRequestWithStatus<AuraPurchaseRegistrationResult>(
      `/v1/users/${encodeURIComponent(subjectUsername)}/aura/purchases`,
      { method: 'POST', auth: true, body: payload },
    );
    return { result, status };
  },
};
