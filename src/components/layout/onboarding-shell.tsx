import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

export function OnboardingShell({
  step,
  children,
}: {
  step: 1 | 2;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-7 pb-12 pt-6 max-sm:px-3 max-sm:pb-7 max-sm:pt-4">
      <header className="mx-auto mb-3.5 flex w-full max-w-295 items-center justify-between px-1.5">
        <BrandLogo />
        <span className="text-[11px] font-semibold text-muted">Step {step} of 2</span>
      </header>
      <div className="mx-auto mb-7 grid w-full max-w-295 grid-cols-2 gap-2 px-1.5 max-sm:mb-4.5" aria-label={`Step ${step} of 2`}>
        <span className="h-1 rounded-full bg-brand" />
        <span className={step === 2 ? "h-1 rounded-full bg-brand" : "h-1 rounded-full bg-border"} />
      </div>
      {children}
    </main>
  );
}
