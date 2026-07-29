import type { LucideIcon } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

export interface IdentityFact {
  icon: LucideIcon;
  label: string;
  value: string;
  copy: string | null;
  hint: string;
}

interface IdentityFactsProps {
  facts: IdentityFact[];
}

export function IdentityFacts({ facts }: IdentityFactsProps) {
  return (
    <section
      className="mt-4 grid gap-3.5 md:grid-cols-3"
      aria-label="Identity details"
    >
      {facts.map((fact) => {
        const Icon = fact.icon;
        return (
          <article
            className="rounded-2xl border border-border bg-white p-5.5"
            key={fact.label}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-info-bg text-brand">
                <Icon size={21} />
              </span>
              {fact.copy && <CopyButton value={fact.copy} label="Copy" />}
            </div>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              {fact.label}
            </span>
            <strong className="mt-1 block break-all text-lg">
              {fact.value}
            </strong>
            <p className="mt-2 text-xs leading-5 text-secondary">{fact.hint}</p>
          </article>
        );
      })}
    </section>
  );
}
