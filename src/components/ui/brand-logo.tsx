'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <span
        className={cn(
          'inline-flex min-h-9.5 min-w-30.5 w-fit flex-col justify-center rounded-lg border border-dashed border-[#9eb7c0] px-2.5 py-1.5 font-bold leading-none text-navy [&_small]:mt-1 [&_small]:text-[8px] [&_small]:font-medium [&_small]:uppercase [&_small]:tracking-[0.05em] [&_small]:text-muted',
          className,
        )}
        aria-label="BeSeen"
        title="Replace /public/brand/beseen-logo.svg with the official supplied logo"
      >
        BeSeen
        <small>logo placeholder</small>
      </span>
    );
  }
  return (
    <img
      className={cn('block h-auto w-31.5 object-contain', className)}
      src="/brand/beSeenLogoType.png"
      alt="BeSeen"
      onError={() => setMissing(true)}
    />
  );
}
