import { apiRequest } from '@/lib/api/transport';
import { avatarApiErrorMessage } from '@/lib/avatar';
import type { CurrentUserProfile, FollowCounts, PublicUserProfile, UsernameAvailability } from '@/types';

export type ProfileUpdate = {
  username?: string;
  bio?: string | null;
  avatarFile?: File;
  removeAvatar?: true;
};

export const profileApi = {
  async me(signal?: AbortSignal): Promise<CurrentUserProfile> {
    return (await apiRequest<{ user: CurrentUserProfile }>('/v1/users/me', { auth: true, signal })).user;
  },
  async update(changes: ProfileUpdate): Promise<CurrentUserProfile> {
    const { avatarFile, ...payload } = changes;
    if (avatarFile && payload.removeAvatar) {
      throw new Error('An avatar cannot be uploaded and removed in the same update.');
    }
    const body = avatarFile
      ? (() => {
          const formData = new FormData();
          if (Object.keys(payload).length > 0) {
            formData.append('payload', JSON.stringify(payload));
          }
          formData.append('avatar', avatarFile);
          return formData;
        })()
      : payload;

    return (
      await apiRequest<{ user: CurrentUserProfile }>('/v1/users/me', {
        method: 'PATCH',
        body,
        auth: true,
      })
    ).user;
  },
  async public(username: string, signal?: AbortSignal): Promise<PublicUserProfile> {
    return (
      await apiRequest<{ user: PublicUserProfile }>(`/v1/users/${encodeURIComponent(username)}`, { signal })
    ).user;
  },
  async followCounts(username: string, signal?: AbortSignal): Promise<FollowCounts> {
    return apiRequest<FollowCounts>(
      `/v1/users/${encodeURIComponent(username)}/follow-counts`,
      { signal },
    );
  },
  keys(username: string, signal?: AbortSignal) {
    return apiRequest<{
      derivationVersion: number;
      signing: { algorithm: 'Ed25519'; publicKey: string };
      encryption: { algorithm: 'X25519'; publicKey: string };
    }>(`/v1/users/${encodeURIComponent(username)}/keys`, { signal });
  },
  availability(username: string, signal?: AbortSignal) {
    return apiRequest<UsernameAvailability>(
      `/v1/users/username/availability?username=${encodeURIComponent(username)}`,
      { signal },
    );
  },
};

export function profileUpdateErrorMessage(cause: unknown): string {
  return (
    avatarApiErrorMessage(cause) ??
    (cause instanceof Error ? cause.message : 'Your profile could not be updated.')
  );
}

