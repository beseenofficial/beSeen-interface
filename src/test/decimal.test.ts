import { describe, expect, it } from 'vitest';
import { compareDecimalStrings, formatUsdc, isCanonicalDecimal } from '@/lib/decimal';

describe('decimal-safe USDC helpers', () => {
  it('validates canonical decimals with at most seven decimal places', () => {
    expect(isCanonicalDecimal('10.1234567')).toBe(true);
    expect(isCanonicalDecimal('10.12345678')).toBe(false);
    expect(isCanonicalDecimal('01')).toBe(false);
  });

  it('compares and formats without floating-point conversion', () => {
    expect(compareDecimalStrings('999999999999999999.1', '999999999999999999.09')).toBe(1);
    expect(compareDecimalStrings('20.0', '20')).toBe(0);
    expect(formatUsdc('0')).toBe('0 USDC');
  });
});
