import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-end justify-between gap-6 max-sm:mb-6">
      <div>
        {eyebrow && <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">{eyebrow}</span>}
        <h1 className="text-[clamp(36px,4vw,44px)] font-semibold max-sm:text-[35px]">{title}</h1>
        {description && <p className="mt-2.25 text-secondary">{description}</p>}
      </div>
      {action}
    </header>
  );
}
