import { cn } from '@/lib/utils';

export function AuraRipple({
  className,
  tone = 'blue',
}: {
  className?: string;
  tone?: 'blue' | 'lilac' | 'aqua' | 'peach';
}) {
  const tones = {
    blue: 'text-brand',
    lilac: 'text-[#7d6ee4]',
    aqua: 'text-[#1595a3]',
    peach: 'text-[#c96047]',
  };
  const ring =
    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current opacity-10';
  return (
    <span
      className={cn(' block size-75', tones[tone], className)}
      aria-hidden="true"
    >
      <i className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-50" />
      <i className={cn(ring, 'size-31.5')} />
      <i className={cn(ring, 'size-71.5')} />
    </span>
  );
}
