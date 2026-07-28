import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-7 pb-12 pt-6 max-sm:px-3 max-sm:pb-7 max-sm:pt-4">
      <header className="mx-auto mb-7 flex w-full max-w-295 items-center justify-between px-1.5">
        <BrandLogo />
        <span className="text-[11px] font-semibold text-muted">
          Last step
        </span>
      </header>
      {children}
    </main>
  );
}
