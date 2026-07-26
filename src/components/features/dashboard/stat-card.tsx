import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  meta,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  meta?: string;
  tone: "lilac" | "lime" | "peach" | "blue";
  icon: LucideIcon;
}) {
  const accents = {
    lilac: "before:bg-[#8978ed] text-[#8978ed]",
    lime: "before:bg-[#aeb721] text-[#aeb721]",
    peach: "before:bg-[#e1775d] text-[#e1775d]",
    blue: "before:bg-brand text-brand",
  };
  return (
    <article className={`flex min-h-46 flex-col rounded-2xl border border-border bg-white p-6 before:mb-5 before:h-0.75 before:w-8.5 before:rounded-sm before:content-[''] max-sm:min-h-40 ${accents[tone]}`}>
      <span className="-mt-8.5 ml-auto"><Icon size={20} /></span>
      <p className="mt-3.75 text-[13px] text-secondary">{label}</p>
      <strong className="mt-1.25 text-[clamp(24px,2.3vw,30px)] font-semibold leading-[1.2] text-navy">{value}</strong>
      {meta && <span className="mt-auto text-[11px] text-muted">{meta}</span>}
    </article>
  );
}
