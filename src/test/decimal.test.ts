import { describe, expect, it } from 'vitest';
import {
  baseUnitsToDecimalString,
  compareDecimalStrings,
  formatAuraPrice,
  formatUsdc,
  isCanonicalDecimal,
} from '@/lib/decimal';

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

  it.each([
    ['10000000', '1'],
    ['15000000', '1.5'],
    ['1', '0.0000001'],
    ['0', '0'],
    ['123456789012345678901234567', '12345678901234567890.1234567'],
  ])('converts %s base units to the exact decimal %s', (baseUnits, expected) => {
    expect(baseUnitsToDecimalString(baseUnits)).toBe(expected);
  });

  it('rejects base units that are not a non-negative integer string', () => {
    expect(() => baseUnitsToDecimalString('1.5')).toThrow(/integer string/i);
    expect(() => baseUnitsToDecimalString('-1')).toThrow(/integer string/i);
    expect(() => baseUnitsToDecimalString('')).toThrow(/integer string/i);
  });

  it('formats an Aura price without ever parsing it as a float', () => {
    expect(formatAuraPrice('15000000')).toBe('1.5');
    expect(formatAuraPrice('25000000000000')).toBe('2500000');
  });

  it('returns null for an unavailable Aura price instead of a misleading zero', () => {
    expect(formatAuraPrice(null)).toBeNull();
  });
});
