import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, parseEnvelope } from '@/lib/api/transport';

afterEach(() => vi.restoreAllMocks());

describe('API response envelopes', () => {
  it('returns only the success result', async () => {
    const response = new Response(
      JSON.stringify({ status: 'success', message: 'ok', result: { value: 7 } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    await expect(parseEnvelope<{ value: number }>(response)).resolves.toEqual({ value: 7 });
  });

  it('throws typed status, code, message, and validation issues', async () => {
    const response = new Response(
      JSON.stringify({
        status: 'error',
        message: 'Invalid input',
        result: { code: 'VALIDATION_ERROR', issues: [{ path: 'username', message: 'Taken' }] },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
    const error = (await parseEnvelope(response).catch((cause) => cause)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' });
    expect(error.issues).toEqual([{ path: 'username', message: 'Taken' }]);
  });

  it('handles non-JSON responses without exposing response bodies', async () => {
    const error = (await parseEnvelope(new Response('<html>bad gateway</html>', { status: 502 })).catch(
      (cause) => cause as ApiError,
    )) as ApiError;
    expect(error.code).toBe('MALFORMED_RESPONSE');
    expect(error.message).not.toContain('bad gateway');
  });
});
