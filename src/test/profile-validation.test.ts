import { describe, expect, it } from 'vitest';
import { bioCodePointLength, bioValidationError, normalizeBio } from '@/lib/profile-validation';

describe('profile bio validation', () => {
  it('counts Unicode code points instead of UTF-16 units', () => {
    expect(bioCodePointLength('🙂'.repeat(64))).toBe(64);
    expect(bioValidationError('🙂'.repeat(64))).toBeNull();
    expect(bioValidationError('🙂'.repeat(65))).toMatch(/64 characters/);
  });

  it('rejects either newline form and trims or clears submitted values', () => {
    expect(bioValidationError('first\nsecond')).toBe('Bio must be a single line.');
    expect(bioValidationError('first\rsecond')).toBe('Bio must be a single line.');
    expect(normalizeBio('  Building private social tools  ')).toBe('Building private social tools');
    expect(normalizeBio('   ')).toBeNull();
  });
});
