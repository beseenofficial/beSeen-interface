import { BadgeCheck } from 'lucide-react';
import type { UserVerification } from '@/types';
import { cn } from '@/lib/utils';

export function VerificationBadge({
  verification,
  className,
  size = 20,
}: {
  verification?: UserVerification | null;
  className?: string;
  size?: number;
}) {
  if (verification?.isVerified !== true) return null;
  return (
    <BadgeCheck
      className={cn('shrink-0 text-brand', className)}
      size={size}
      role="img"
      aria-label="Verified account"
    />
  );
}
