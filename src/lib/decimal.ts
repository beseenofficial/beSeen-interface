const CANONICAL_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function isCanonicalDecimal(value: string, maximumFractionDigits = 7): boolean {
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
