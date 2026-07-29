import { apiRequest, apiRequestWithStatus } from '@/lib/api/transport';
import type { TokenHolding, UserToken } from '@/types';

export const tokenApi = {
  async profileToken(username: string, signal?: AbortSignal): Promise<UserToken> {
    return (
      await apiRequest<{ token: UserToken }>(`/v1/users/${encodeURIComponent(username)}/token`, {
        signal,
      })
    ).token;
  },
  async purchase(username: string): Promise<{ holding: TokenHolding; created: boolean }> {
    const { result, status } = await apiRequestWithStatus<{ holding: TokenHolding }>(
      `/v1/users/${encodeURIComponent(username)}/token/purchase`,
      { method: 'POST', auth: true },
    );
    return { holding: result.holding, created: status === 201 };
  },
  async mine(signal?: AbortSignal): Promise<UserToken[]> {
    return (await apiRequest<{ tokens: UserToken[] }>('/v1/users/me/tokens', { auth: true, signal }))
      .tokens;
  },
  async followerCount(username: string, signal?: AbortSignal): Promise<number> {
    return (
      await apiRequest<{ followerCount: number }>(
        `/v1/users/${encodeURIComponent(username)}/followers/count`,
        { signal },
      )
    ).followerCount;
  },
};

