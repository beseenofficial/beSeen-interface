import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ActivityStat {
  value: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface AccountActivityProps {
  stats: ActivityStat[];
}

export function AccountActivity({ stats }: AccountActivityProps) {
  return (
    <section
      className="mt-4 grid overflow-hidden rounded-2xl border border-border bg-white sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Account activity"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <button
            className="flex min-h-20 items-center gap-4 border-border px-6 text-left transition hover:bg-subtle sm:[&:nth-child(even)]:border-l xl:border-l xl:first:border-l-0"
            key={stat.label}
            onClick={stat.onClick}
            type="button"
          >
            <strong className="text-[30px] leading-none">{stat.value}</strong>
            <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand">
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm">{stat.label}</b>
              <small className="text-xs text-muted">{stat.sublabel}</small>
            </span>
            {index === stats.length - 1 && stat.onClick && (
              <ArrowRight className="ml-auto text-muted" size={18} />
            )}
          </button>
        );
      })}
    </section>
  );
}
