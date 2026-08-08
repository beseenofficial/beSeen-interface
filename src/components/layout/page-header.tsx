import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-7 flex min-w-0 items-start justify-between gap-6 max-sm:mb-5 max-sm:flex-col max-sm:gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.08em] text-brand">
            {eyebrow}
          </span>
        )}
        <h1 className="text-[clamp(30px,2.4vw,38px)] font-semibold max-sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm leading-5 text-secondary max-sm:max-w-[32rem]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 max-sm:w-full max-sm:[&>*]:w-full">{action}</div>}
    </header>
  );
}
