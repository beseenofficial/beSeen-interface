import { isCanonicalDecimal } from '@/lib/decimal';

export function getBeSeenContractAddress(): string {
  const address = process.env.NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS?.trim();
  if (!address) {
    throw new Error('NEXT_PUBLIC_BESEEN_CONTRACT_ADDRESS is required.');
  }
  return address;
}

export const BOUNTY_AMOUNT_DECIMALS = 7;

export function toBountyContractAmount(amount: string): string {
  if (!isCanonicalDecimal(amount, BOUNTY_AMOUNT_DECIMALS)) {
    throw new Error('The bounty amount must have at most 7 decimal places.');
  }

  const [whole, fraction = ''] = amount.split('.');
  const scaled = `${whole}${fraction.padEnd(BOUNTY_AMOUNT_DECIMALS, '0')}`
    .replace(/^0+(?=\d)/, '');

  if (scaled === '0') throw new Error('The bounty amount must be greater than zero.');
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
