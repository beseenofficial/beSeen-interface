import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DashboardPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full px-10 pb-10 pt-9 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
