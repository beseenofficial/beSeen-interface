import { apiRequest } from '@/lib/api/transport';
import type { PublicUser, User, UsernameAvailability } from '@/types';

export const profileApi = {
  async me(signal?: AbortSignal): Promise<User> {
    return (await apiRequest<{ user: User }>('/v1/users/me', { auth: true, signal })).user;
  },
  async update(changes: { username?: string; avatar?: string | null }): Promise<User> {
    return (
      await apiRequest<{ user: User }>('/v1/users/me', {
        method: 'PATCH',
        body: changes,
        auth: true,
      })
    ).user;
  },
  async public(username: string, signal?: AbortSignal): Promise<PublicUser> {
    return (
      await apiRequest<{ user: PublicUser }>(`/v1/users/${encodeURIComponent(username)}`, { signal })
    ).user;
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

