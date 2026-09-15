import { describe, expect, it } from 'vitest';
import {
  bountyDeadline,
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
  });

  it('creates a u64 Unix deadline from the selected duration', () => {
    expect(bountyDeadline(86_400, 1_700_000_000_400)).toBe(1_700_086_400);
  });
});
