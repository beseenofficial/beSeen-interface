import { cn } from '@/lib/utils';

export function UsdcLogo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={cn('block shrink-0 rounded-full', className)}
      height="32"
      src="/images/circle-usdc-logo.webp"
      width="32"
    />
  );
}
