import { describe, expect, it } from 'vitest';
import {
  bountyDeadline,
  contractU64ToString,
  getBeSeenContractAddress,
  toBountyContractAmount,
} from '@/lib/bounty-contract';

describe('bounty contract values', () => {
  it('reads the BeSeen contract address from the public environment', () => {
    const previous = process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS;
    process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS = 'CENVADDRESS';
    try {
      expect(getBeSeenContractAddress()).toBe('CENVADDRESS');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS;
      else process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS = previous;
    }
  });

  it.each([
    ['23', '230000000'],
    ['10.25', '102500000'],
    ['0.0000001', '1'],
    ['12345678901234567890.1234567', '123456789012345678901234567'],
  ])('scales %s to an exact i128 integer', (amount, expected) => {
    expect(toBountyContractAmount(amount)).toBe(expected);
  });

  it('rejects values that cannot be represented with 7 decimals', () => {
    expect(() => toBountyContractAmount('1.00000001')).toThrow(/7 decimal places/i);
    expect(() => toBountyContractAmount('0')).toThrow(/greater than zero/i);
    expect(() => toBountyContractAmount('-1')).toThrow();
    expect(() => toBountyContractAmount('1e3')).toThrow();
    expect(() => toBountyContractAmount('1,000')).toThrow();
  });

  it('accepts exactly the positive i128 maximum and rejects one unit more', () => {
    const maxI128 = (1n << 127n) - 1n;
    const maxWhole = maxI128 / 10_000_000n;
    const maxFraction = maxI128 % 10_000_000n;
    const maxAmount = `${maxWhole}.${String(maxFraction).padStart(7, '0')}`;
    expect(toBountyContractAmount(maxAmount)).toBe(maxI128.toString());
    expect(() => toBountyContractAmount(`${maxWhole + 1n}`)).toThrow(/i128/i);
  });

  it('creates a u64 Unix deadline from the selected duration', () => {
    expect(bountyDeadline(86_400, 1_700_000_000_400)).toBe(1_700_086_400);
  });

  it.each([
    [7n, '7'],
    [42, '42'],
    ['9007199254740993', '9007199254740993'],
    [(1n << 64n) - 1n, '18446744073709551615'],
  ])('normalizes the contract u64 %s to the string %s', (value, expected) => {
    expect(contractU64ToString(value)).toBe(expected);
  });

  it('rejects u64 values that are unsafe, negative, or malformed', () => {
    expect(() => contractU64ToString(Number.MAX_SAFE_INTEGER + 1)).toThrow(/safe integer/i);
    expect(() => contractU64ToString(-1n)).toThrow();
    expect(() => contractU64ToString('abc')).toThrow(/u64/i);
    expect(() => contractU64ToString(null)).toThrow(/u64/i);
    expect(() => contractU64ToString(1n << 64n)).toThrow();
  });
});
