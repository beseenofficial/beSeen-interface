import { afterEach, describe, expect, it } from 'vitest';
import { invalidateAuthenticatedData, subscribeToInvalidation, type DataResource } from '@/lib/data-invalidation';

describe('login and registration data refresh contract', () => {
  let unsubscribe: (() => void) | undefined;
  afterEach(() => unsubscribe?.());

  it('invalidates current user, conversations, and follow counts without a global reset', () => {
    const resources: DataResource[] = [];
    unsubscribe = subscribeToInvalidation((event) => resources.push(event.resource));
    invalidateAuthenticatedData();
    expect(resources).toEqual(['current-user', 'conversations', 'follow-counts']);
  });
});
