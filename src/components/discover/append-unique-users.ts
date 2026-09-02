import type { DiscoverUser } from '@/types';

export function appendUniqueUsers(current: DiscoverUser[], incoming: DiscoverUser[]): DiscoverUser[] {
  const usersById = new Map(current.map((user) => [user.id, user]));
  incoming.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
}
