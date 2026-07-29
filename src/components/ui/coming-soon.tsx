import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { StatusBadge } from "@/components/ui/status-badge";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-12 pb-16 pt-12 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <section className="relative flex min-h-140 w-full max-w-195 flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-white p-14 text-center max-sm:min-h-130 max-sm:px-6 max-sm:py-10">
        <AuraRipple className="absolute -right-20 -top-22.5" tone="lilac" />
        <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-[#f0edff] text-[#6755c9]">
          <Icon size={26} />
        </span>
        <StatusBadge tone="warning">In development</StatusBadge>
        <h1 className="mt-4.5 text-[clamp(36px,5vw,50px)] font-semibold">
          {title}
        </h1>
        <p className="mt-3.75 max-w-117.5 text-[17px] text-secondary">
          {description}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11.5 items-center justify-center gap-2.25 rounded-xl px-3 font-semibold text-brand hover:bg-info-bg"
        >
          <ArrowLeft size={17} /> Back to overview
        </Link>
      </section>
    </div>
  );
}
