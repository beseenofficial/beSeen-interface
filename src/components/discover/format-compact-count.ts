export function formatCompactCount(value: number | null | undefined): string {
  const count = Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
  if (count < 1_000) return Math.trunc(count).toLocaleString();

  const units = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' },
  ] as const;
  const unit = units.find(({ threshold }) => count >= threshold) ?? units[units.length - 1];
  const compact = Math.floor((count / unit.threshold) * 10) / 10;
  return `${compact.toFixed(compact % 1 === 0 ? 0 : 1)}${unit.suffix}`;
}
