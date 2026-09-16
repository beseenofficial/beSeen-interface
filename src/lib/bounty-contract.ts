import { isCanonicalDecimal, TOKEN_DECIMALS } from '@/lib/decimal';

export function getBeSeenContractAddress(): string {
  const address = process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS?.trim();
  if (!address) {
    throw new Error('NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS is required.');
  }
  return address;
}

export const BOUNTY_AMOUNT_DECIMALS = TOKEN_DECIMALS;

const MAX_U64 = (1n << 64n) - 1n;

/**
 * Normalizes a contract u64 return value (Aura token IDs, bounty IDs) to its
 * canonical positive decimal string. Accepts the native values Soroban SDK
 * decoders produce (bigint, number, or numeric string) and never goes through
 * a JavaScript float for large values.
 */
export function contractU64ToString(value: unknown): string {
  let parsed: bigint;
  if (typeof value === 'bigint') {
    parsed = value;
  } else if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('The contract returned an ID that is not a safe integer.');
    }
    parsed = BigInt(value);
  } else if (typeof value === 'string' && /^\d+$/.test(value)) {
    parsed = BigInt(value);
  } else {
    throw new Error('The contract did not return a valid u64 identifier.');
  }
  if (parsed < 1n || parsed > MAX_U64) {
    throw new Error('The contract returned an ID outside the positive u64 range.');
  }
  return parsed.toString();
}

const MAX_I128 = (1n << 127n) - 1n;

/**
 * Converts a canonical USDC decimal string to exact 7-decimal contract base
 * units using string arithmetic only — never a JavaScript float. Rejects
 * zero, negatives, scientific notation, and anything exceeding the positive
 * i128 range the contract amount parameter accepts.
 */
export function toBountyContractAmount(amount: string): string {
  if (!isCanonicalDecimal(amount, BOUNTY_AMOUNT_DECIMALS)) {
    throw new Error('The bounty amount must have at most 7 decimal places.');
  }

  const [whole, fraction = ''] = amount.split('.');
  const scaled = `${whole}${fraction.padEnd(BOUNTY_AMOUNT_DECIMALS, '0')}`
    .replace(/^0+(?=\d)/, '');

  if (scaled === '0') throw new Error('The bounty amount must be greater than zero.');
  if (BigInt(scaled) > MAX_I128) {
    throw new Error('The bounty amount exceeds the contract i128 range.');
  }
  return scaled;
}

export function bountyDeadline(
  durationSeconds: number,
  nowMilliseconds = Date.now(),
): number {
  if (!Number.isSafeInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error('The bounty duration must be a positive whole number of seconds.');
  }

  return Math.round(nowMilliseconds / 1000) + durationSeconds;
}
