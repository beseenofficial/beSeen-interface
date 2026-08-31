export const BIO_MAX_CODE_POINTS = 64;

export function bioCodePointLength(value: string): number {
  return Array.from(value).length;
}

export function normalizeBio(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function bioValidationError(value: string): string | null {
  if (/\r|\n/.test(value)) return 'Bio must be a single line.';
  if (bioCodePointLength(value.trim()) > BIO_MAX_CODE_POINTS) {
    return `Bio must be ${BIO_MAX_CODE_POINTS} characters or fewer.`;
  }
  return null;
}
