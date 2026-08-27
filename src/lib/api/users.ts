import { apiRequest } from '@/lib/api/transport';
import type { DiscoverUsersQuery, DiscoverUsersResult } from '@/types';

export async function discoverUsers(
  query: DiscoverUsersQuery = {},
  signal?: AbortSignal,
): Promise<DiscoverUsersResult> {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(query.limit ?? 20));
  if (query.cursor) parameters.set('cursor', query.cursor);

  return apiRequest<DiscoverUsersResult>(`/v1/users/discover?${parameters.toString()}`, { signal });
}

export const usersApi = {
  discover: discoverUsers,
};
