import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedResult, DerivedKeys } from '@/types';

const setSecureJson = vi.fn(async () => {});
vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async () => null),
  setSecureJson,
  deleteSecureRecord: vi.fn(async () => {}),
}));

const authenticatedResult: AuthenticatedResult = {
  user: {
    id: '507f1f77bcf86cd799439011',
    username: 'new_user',
    avatar: 'https://images.beseen.fi/avatars/user/avatar.webp',
    createdAt: '2026-07-31T00:00:00.000Z',
  },
  auth: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshTokenExpiresAt: '2026-08-30T00:00:00.000Z',
  },
};

const keys: DerivedKeys = {
  signingPublicKey: new Uint8Array(32).fill(1),
  signingPrivateKey: new Uint8Array(64).fill(2),
  encryptionPublicKey: new Uint8Array(32).fill(3),
  encryptionPrivateKey: new Uint8Array(32).fill(4),
};

function successResponse() {
  return new Response(
    JSON.stringify({ status: 'success', message: 'ok', result: authenticatedResult }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}

async function register(avatarFile?: File) {
  const { authApi } = await import('@/lib/api/auth');
  return authApi.register({
    walletAddress: 'gcfiry65oqe7dfp5klns2pf2lvzmuzyjx4ozieq36n2iqanub5xvyojr',
    username: '  New_User  ',
    avatarFile,
    keys,
  });
}

function requestFromFetch(): RequestInit {
  const fetchMock = vi.mocked(fetch);
  return fetchMock.mock.calls[0][1] ?? {};
}

describe('registration avatar transport', () => {
  beforeEach(() => {
    vi.resetModules();
    setSecureJson.mockClear();
    vi.stubGlobal('fetch', vi.fn(async () => successResponse()));
  });

  it('sends the exact public registration payload and avatar multipart fields', async () => {
    const avatar = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
    await expect(register(avatar)).resolves.toEqual(authenticatedResult.user);

    const request = requestFromFetch();
    expect(request.body).toBeInstanceOf(FormData);
    const formData = request.body as FormData;
    expect(Array.from(formData.keys())).toEqual(['payload', 'avatar']);
    expect(formData.get('avatar')).toBe(avatar);
    expect(JSON.parse(String(formData.get('payload')))).toEqual({
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'new_user',
      keys: {
        signing: {
          algorithm: 'Ed25519',
          publicKey: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
        },
        encryption: {
          algorithm: 'X25519',
          publicKey: 'AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM=',
        },
      },
    });

    const serializedPayload = String(formData.get('payload'));
    expect(serializedPayload).not.toContain('avatar');
    expect(serializedPayload).not.toContain('keyVersion');
    expect(serializedPayload).not.toContain('derivationVersion');
    expect(serializedPayload).not.toContain('signingPrivateKey');
    expect(serializedPayload).not.toContain('encryptionPrivateKey');
    expect(serializedPayload).not.toContain(Buffer.from(keys.signingPrivateKey).toString('base64'));
    expect(serializedPayload).not.toContain(Buffer.from(keys.encryptionPrivateKey).toString('base64'));
  });

  it('registers without an avatar using only the payload field', async () => {
    await register();
    const formData = requestFromFetch().body as FormData;
    expect(Array.from(formData.keys())).toEqual(['payload']);
    expect(formData.get('avatar')).toBeNull();
  });

  it('lets the browser assign the multipart boundary', async () => {
    await register(new File(['image'], 'avatar.webp', { type: 'image/webp' }));
    const headers = new Headers(requestFromFetch().headers);
    expect(headers.get('Content-Type')).toBeNull();
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('keeps successful registration session persistence unchanged', async () => {
    await register();
    expect(setSecureJson).toHaveBeenCalledWith('session:refresh-token', {
      refreshToken: 'refresh-token',
    });

    const { hasAccessToken } = await import('@/lib/api/transport');
    expect(hasAccessToken()).toBe(true);
  });
});

describe('registration avatar backend errors', () => {
  it.each([
    [
      'INVALID_AVATAR',
      'Please select a valid JPEG, PNG, or WebP image of at least 128×128 pixels.',
    ],
    ['AVATAR_TOO_LARGE', 'The profile image must be 5 MB or smaller.'],
    [
      'AVATAR_STORAGE_UNAVAILABLE',
      'The profile image service is temporarily unavailable. Please try again.',
    ],
  ])('maps %s to a clear UI message', async (code, message) => {
    const { ApiError } = await import('@/lib/api/transport');
    const { registrationErrorMessage } = await import('@/lib/api/auth');
    expect(registrationErrorMessage(new ApiError('backend message', 400, code))).toBe(message);
  });

  it('preserves existing registration error messages', async () => {
    const { ApiError } = await import('@/lib/api/transport');
    const { registrationErrorMessage } = await import('@/lib/api/auth');
    expect(
      registrationErrorMessage(new ApiError('Username is already taken', 409, 'USERNAME_TAKEN')),
    ).toBe('Username is already taken');
  });
});
