import type { LucideIcon } from 'lucide-react';

export interface StatCard {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  note: string;
  tone: string;
}

interface BroadcastStatsProps {
  stats: StatCard[];
}

export function BroadcastStats({ stats }: BroadcastStatsProps) {
  return (
    <section
      className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Broadcast summary"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            className="flex min-h-31 items-center gap-4 rounded-2xl border border-border bg-white p-5"
            key={stat.label}
          >
            <span
              className={`grid size-13 shrink-0 place-items-center rounded-xl ${stat.tone}`}
            >
              <Icon size={25} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-secondary">
                {stat.label}
              </span>
              <strong className="mt-1 block truncate text-[23px]">
                {stat.value}
              </strong>
              <span className="mt-1 block text-[11px] text-muted">
                {stat.detail && (
                  <b className="mr-2 text-success">{stat.detail}</b>
                )}
                {stat.note}
              </span>
            </span>
          </article>
        );
      })}
    </section>
  );
}
