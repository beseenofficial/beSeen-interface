import { describe, expect, it } from 'vitest';
import { validateUsername } from '@/lib/api';

describe('username validation', () => {
  it.each(['alice', 'alice2', 'a12', 'User2026'])(
    'accepts an English-letter username: %s',
    (username) => {
      expect(validateUsername(username)).toBe(true);
    },
  );

  it.each(['1alice', '123', 'ali_ce', 'ali-ce', 'علی', 'ab'])(
    'rejects an invalid username: %s',
    (username) => {
      expect(validateUsername(username)).toBe(false);
    },
  );
});
