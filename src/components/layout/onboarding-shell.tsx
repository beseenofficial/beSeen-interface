import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-svh flex-col overflow-x-hidden overflow-y-auto px-7 pb-6 pt-6 max-[900px]:h-auto max-[900px]:min-h-svh max-[900px]:overflow-visible max-sm:px-3 max-sm:pb-7 max-sm:pt-4">
      <header className="mx-auto mb-5 flex w-full max-w-295 shrink-0 items-center justify-between px-1.5">
        <BrandLogo />
        <span className="text-[11px] font-semibold text-muted">
          Last step
        </span>
      </header>
      <div className="min-h-max flex-1 max-[900px]:flex-none">{children}</div>
    </main>
  );
}
