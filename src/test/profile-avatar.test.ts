import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';

vi.mock('@/lib/secure-storage', () => ({
  getSecureJson: vi.fn(async () => null),
  setSecureJson: vi.fn(async () => {}),
  deleteSecureRecord: vi.fn(async () => {}),
}));

const updatedUser: User = {
  id: '507f1f77bcf86cd799439011',
  username: 'updated_user',
  avatar: 'https://images.beseen.fi/avatars/user/updated.webp',
  createdAt: '2026-07-31T00:00:00.000Z',
};

function successResponse() {
  return new Response(
    JSON.stringify({ status: 'success', message: 'ok', result: { user: updatedUser } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function requestFromFetch(): RequestInit {
  return vi.mocked(fetch).mock.calls[0][1] ?? {};
}

describe('profile avatar transport', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => successResponse()));
    const { storeSession } = await import('@/lib/api/transport');
    await storeSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshTokenExpiresAt: '2026-08-30T00:00:00.000Z',
    });
  });

  it('uploads a new avatar with an optional username payload', async () => {
    const avatar = new File(['image'], 'new-avatar.jpeg', { type: 'image/jpeg' });
    const { profileApi } = await import('@/lib/api/profiles');
    await expect(
      profileApi.update({ username: 'updated_user', avatarFile: avatar }),
    ).resolves.toEqual(updatedUser);

    const request = requestFromFetch();
    const headers = new Headers(request.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('Content-Type')).toBeNull();
    expect(request.body).toBeInstanceOf(FormData);

    const formData = request.body as FormData;
    expect(Array.from(formData.keys())).toEqual(['payload', 'avatar']);
    expect(JSON.parse(String(formData.get('payload')))).toEqual({ username: 'updated_user' });
    expect(formData.get('avatar')).toBe(avatar);
  });

  it('supports an avatar-only multipart update without an empty payload field', async () => {
    const avatar = new File(['image'], 'new-avatar.webp', { type: 'image/webp' });
    const { profileApi } = await import('@/lib/api/profiles');
    await profileApi.update({ avatarFile: avatar });

    const formData = requestFromFetch().body as FormData;
    expect(Array.from(formData.keys())).toEqual(['avatar']);
    expect(formData.get('payload')).toBeNull();
  });

  it('removes the current avatar with the backend removeAvatar field', async () => {
    const { profileApi } = await import('@/lib/api/profiles');
    await profileApi.update({ removeAvatar: true });

    const request = requestFromFetch();
    expect(request.body).toBe(JSON.stringify({ removeAvatar: true }));
    expect(new Headers(request.headers).get('Content-Type')).toBe('application/json');
  });

  it('keeps username-only profile updates as JSON', async () => {
    const { profileApi } = await import('@/lib/api/profiles');
    await profileApi.update({ username: 'updated_user' });

    const request = requestFromFetch();
    expect(request.body).toBe(JSON.stringify({ username: 'updated_user' }));
    expect(new Headers(request.headers).get('Content-Type')).toBe('application/json');
  });

  it('does not send conflicting upload and removal instructions', async () => {
    const { profileApi } = await import('@/lib/api/profiles');
    await expect(
      profileApi.update({
        avatarFile: new File(['image'], 'avatar.png', { type: 'image/png' }),
        removeAvatar: true,
      }),
    ).rejects.toThrow('An avatar cannot be uploaded and removed in the same update.');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('profile avatar backend errors', () => {
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
  ])('maps %s to the avatar UI message', async (code, message) => {
    const { ApiError } = await import('@/lib/api/transport');
    const { profileUpdateErrorMessage } = await import('@/lib/api/profiles');
    expect(profileUpdateErrorMessage(new ApiError('backend message', 400, code))).toBe(message);
  });
});
