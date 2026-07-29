import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = new Map<string, unknown>();
vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async (id: string) => records.get(id) ?? null),
  setSecureJson: vi.fn(async (id: string, value: unknown) => void records.set(id, value)),
  deleteSecureRecord: vi.fn(async (id: string) => void records.delete(id)),
}));

const success = (result: unknown, status = 200) =>
  new Response(JSON.stringify({ status: 'success', message: 'ok', result }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const unauthorized = () =>
  new Response(JSON.stringify({ status: 'error', message: 'expired', result: { code: 'UNAUTHORIZED' } }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

describe('single-flight session refresh', () => {
  beforeEach(async () => {
    records.clear();
    vi.resetModules();
  });

  it('queues concurrent 401s behind one refresh and retries each request once', async () => {
    const transport = await import('@/lib/api/transport');
    await transport.storeSession({
      accessToken: 'old-access', refreshToken: 'old-refresh', tokenType: 'Bearer', expiresIn: 1,
      refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
    });
    let refreshes = 0;
    const attempts = new Map<string, number>();
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/refresh')) {
        refreshes += 1;
        await Promise.resolve();
        return success({ auth: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900, refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z' } });
      }
      const count = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, count);
      return count === 1 ? unauthorized() : success({ ok: true });
    }));

    await expect(
      Promise.all([
        transport.apiRequest('/v1/protected/a', { auth: true }),
        transport.apiRequest('/v1/protected/b', { auth: true }),
      ]),
    ).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(records.get('session:refresh-token')).toEqual({ refreshToken: 'new-refresh' });
  });

  it('does not enter a refresh loop when the one retry is also unauthorized', async () => {
    const transport = await import('@/lib/api/transport');
    await transport.storeSession({
      accessToken: 'old', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 1,
      refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
    });
    let refreshes = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/v1/auth/refresh')) {
        refreshes += 1;
        return success({ auth: { accessToken: 'new', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900, refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z' } });
      }
      return unauthorized();
    }));
    await expect(transport.apiRequest('/v1/protected', { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(refreshes).toBe(1);
  });
});
