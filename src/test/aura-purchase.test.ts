// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, requestWithStatus } = vi.hoisted(() => ({
  request: vi.fn(),
  requestWithStatus: vi.fn(),
}));
vi.mock('@/lib/api/transport', () => {
  // Provide a real ApiError class: the workflow relies on `instanceof` checks.
  class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code: string,
      public issues: { path: string; message: string }[] = [],
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return { apiRequest: request, apiRequestWithStatus: requestWithStatus, ApiError };
});

const storage = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async (id: string) => storage.get(id) ?? null),
  setSecureJson: vi.fn(async (id: string, value: unknown) => void storage.set(id, structuredClone(value))),
  deleteSecureRecord: vi.fn(async (id: string) => void storage.delete(id)),
}));

import { auraApi, type AuraPurchaseRegistrationPayload } from '@/lib/api/aura';
import { ApiError } from '@/lib/api/transport';
import {
  discardPendingAuraPurchase,
  loadPendingAuraPurchase,
  registerAndConfirmAuraPurchase,
} from '@/lib/aura-purchase-workflow';

const payload: AuraPurchaseRegistrationPayload = {
  tokenId: '42',
  buyerAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
  subjectAddress: 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6',
  transactionHash: 'a'.repeat(64),
};

function purchaseResult(status: 'pending' | 'confirmed', conversation: { id: string; created: boolean } | null = null) {
  return {
    purchase: {
      tokenId: payload.tokenId,
      buyerId: '507f1f77bcf86cd799439012',
      subjectId: '507f1f77bcf86cd799439013',
      subjectUsername: 'alice',
      transactionHash: payload.transactionHash,
      status,
      confirmedAt: status === 'confirmed' ? '2026-09-15T12:00:00.000Z' : null,
    },
    conversation,
  };
}

describe('auraApi.registerPurchase', () => {
  beforeEach(() => {
    request.mockReset();
    requestWithStatus.mockReset();
  });

  it.each([200, 201, 202])('passes the exact payload and HTTP %s status through', async (status) => {
    const result = purchaseResult(status === 202 ? 'pending' : 'confirmed');
    requestWithStatus.mockResolvedValue({ status, result });
    await expect(auraApi.registerPurchase('alice', payload)).resolves.toEqual({ status, result });
    expect(requestWithStatus).toHaveBeenCalledWith('/v1/users/alice/aura/purchases', {
      method: 'POST',
      auth: true,
      body: payload,
    });
  });

  it('keeps tokenId as a string in the JSON body', async () => {
    requestWithStatus.mockResolvedValue({ status: 201, result: purchaseResult('confirmed') });
    await auraApi.registerPurchase('alice', payload);
    const body = requestWithStatus.mock.calls[0][1].body;
    expect(typeof body.tokenId).toBe('string');
    expect(body.tokenId).toBe('42');
  });
});

describe('registerAndConfirmAuraPurchase', () => {
  beforeEach(() => {
    storage.clear();
    request.mockReset();
    requestWithStatus.mockReset();
  });

  it('confirms immediately on HTTP 201 and clears the pending record', async () => {
    requestWithStatus.mockResolvedValue({
      status: 201,
      result: purchaseResult('confirmed', { id: '507f1f77bcf86cd799439011', created: true }),
    });
    const outcome = await registerAndConfirmAuraPurchase('alice', payload, { baseDelayMs: 1 });
    expect(outcome.state).toBe('confirmed');
    expect(requestWithStatus).toHaveBeenCalledTimes(1);
    expect(await loadPendingAuraPurchase('alice')).toBeNull();
  });

  it('treats HTTP 202 as pending and retries with the identical payload', async () => {
    requestWithStatus
      .mockResolvedValueOnce({ status: 202, result: purchaseResult('pending') })
      .mockResolvedValueOnce({ status: 202, result: purchaseResult('pending') })
      .mockResolvedValueOnce({
        status: 200,
        result: purchaseResult('confirmed', { id: '507f1f77bcf86cd799439011', created: true }),
      });
    const pending: number[] = [];
    const outcome = await registerAndConfirmAuraPurchase('alice', payload, {
      baseDelayMs: 1,
      onPending: (attempt) => pending.push(attempt),
    });
    expect(outcome.state).toBe('confirmed');
    expect(requestWithStatus).toHaveBeenCalledTimes(3);
    const bodies = requestWithStatus.mock.calls.map((call) => call[1].body);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(pending).toEqual([1, 2]);
    expect(await loadPendingAuraPurchase('alice')).toBeNull();
  });

  it('returns pending (not a failure) when the retry budget is exhausted', async () => {
    requestWithStatus.mockResolvedValue({ status: 202, result: purchaseResult('pending') });
    const outcome = await registerAndConfirmAuraPurchase('alice', payload, {
      baseDelayMs: 1,
      maxAttempts: 2,
    });
    expect(outcome.state).toBe('pending');
    expect(requestWithStatus).toHaveBeenCalledTimes(2);
    // The exact payload stays persisted for a later manual retry or reload.
    const stored = await loadPendingAuraPurchase('alice');
    expect(stored?.payload).toEqual(payload);
  });

  it('resumes a persisted registration after reload', async () => {
    requestWithStatus.mockResolvedValue({ status: 202, result: purchaseResult('pending') });
    await registerAndConfirmAuraPurchase('alice', payload, { baseDelayMs: 1, maxAttempts: 1 });
    const stored = await loadPendingAuraPurchase('alice');
    expect(stored?.subjectUsername).toBe('alice');

    requestWithStatus.mockResolvedValue({
      status: 200,
      result: purchaseResult('confirmed', { id: '507f1f77bcf86cd799439011', created: false }),
    });
    const outcome = await registerAndConfirmAuraPurchase(
      stored!.subjectUsername,
      stored!.payload,
      { baseDelayMs: 1 },
    );
    expect(outcome.state).toBe('confirmed');
    expect(await loadPendingAuraPurchase('alice')).toBeNull();
  });

  it('discards the pending record on definitive rejections', async () => {
    requestWithStatus.mockRejectedValue(
      new ApiError('rejected', 409, 'AURA_PURCHASE_REJECTED'),
    );
    await expect(
      registerAndConfirmAuraPurchase('alice', payload, { baseDelayMs: 1 }),
    ).rejects.toMatchObject({ code: 'AURA_PURCHASE_REJECTED' });
    expect(await loadPendingAuraPurchase('alice')).toBeNull();
  });

  it('keeps the pending record when the network result is unknown', async () => {
    requestWithStatus.mockRejectedValue(new TypeError('network result unknown'));
    await expect(
      registerAndConfirmAuraPurchase('alice', payload, { baseDelayMs: 1 }),
    ).rejects.toThrow(/unknown/i);
    const stored = await loadPendingAuraPurchase('alice');
    expect(stored?.payload).toEqual(payload);
    await discardPendingAuraPurchase('alice');
    expect(await loadPendingAuraPurchase('alice')).toBeNull();
  });
});
