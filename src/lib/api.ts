export * from '@/lib/api/index';

import { RESERVED_USERNAMES } from '@/lib/constants';

export function validateUsername(username: string): boolean {
  const normalized = username.trim().toLowerCase();
  return (
    normalized.length >= 3 &&
    normalized.length <= 30 &&
    /^[a-z][a-z0-9]*$/.test(normalized) &&
    !RESERVED_USERNAMES.includes(normalized as (typeof RESERVED_USERNAMES)[number])
  );
}
