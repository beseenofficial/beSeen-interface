const CANONICAL_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

/**
 * Decimal places used by the Stellar USDC-style token flow. All token base-unit
 * conversions in the client go through this single value.
 */
export const TOKEN_DECIMALS = 7;

export function isCanonicalDecimal(value: string, maximumFractionDigits = TOKEN_DECIMALS): boolean {
  if (!CANONICAL_DECIMAL.test(value)) return false;
  const fraction = value.split('.')[1] ?? '';
  return fraction.length <= maximumFractionDigits;
}

function decimalParts(value: string): [string, string] {
  const [whole, fraction = ''] = value.split('.');
  return [whole, fraction];
}

export function compareDecimalStrings(left: string, right: string): number {
  if (!isCanonicalDecimal(left, Number.MAX_SAFE_INTEGER) || !isCanonicalDecimal(right, Number.MAX_SAFE_INTEGER)) {
    throw new Error('Cannot compare an invalid decimal string.');
  }
  const [leftWhole, leftFraction] = decimalParts(left);
  const [rightWhole, rightFraction] = decimalParts(right);
  if (leftWhole.length !== rightWhole.length) return leftWhole.length > rightWhole.length ? 1 : -1;
  if (leftWhole !== rightWhole) return leftWhole > rightWhole ? 1 : -1;
  const width = Math.max(leftFraction.length, rightFraction.length);
  const paddedLeft = leftFraction.padEnd(width, '0');
  const paddedRight = rightFraction.padEnd(width, '0');
  return paddedLeft === paddedRight ? 0 : paddedLeft > paddedRight ? 1 : -1;
}

export function formatUsdc(value: string): string {
  return `${value} USDC`;
}

/**
 * Converts a non-negative base-unit integer string (e.g. a contract i128/u64
 * amount) into its canonical decimal string, using string arithmetic only.
 *
 * Examples with the default 7 decimals: "10000000" -> "1", "15000000" -> "1.5".
 */
export function baseUnitsToDecimalString(
  baseUnits: string,
  decimals: number = TOKEN_DECIMALS,
): string {
  if (!/^\d+$/.test(baseUnits)) {
    throw new Error('Base units must be a non-negative integer string.');
  }
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    throw new Error('Decimals must be a non-negative integer.');
  }
  const digits = baseUnits.replace(/^0+(?=\d)/, '');
  if (decimals === 0) return digits;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals).replace(/^0+(?=\d)/, '');
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * Formats a server-provided Aura price (base-unit integer string) for display.
 * Returns `null` when the price is unavailable so callers can render a
 * retry state instead of a misleading zero. The raw string is never parsed
 * with `Number`.
 */
export function formatAuraPrice(price: string | null | undefined): string | null {
  if (typeof price !== 'string' || !/^\d+$/.test(price)) return null;
  return baseUnitsToDecimalString(price);
}
