"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/lib/blux";

export function PublicDiscoverHeader() {
  const { status } = useAuth();
  const action =
    status === "ready"
      ? { href: "/dashboard", label: "Open dashboard", compactLabel: "Dashboard" }
      : status === "needs-username"
        ? { href: "/onboarding", label: "Finish setup", compactLabel: "Finish setup" }
        : { href: "/login", label: "Join or sign in", compactLabel: "Join" };

  return (
    <header className="discover-glass-header sticky top-0 z-30">
      <div className="mx-auto flex h-17 w-full max-w-[1580px] items-center gap-3 px-4 sm:h-19 sm:px-6 lg:px-10">
        <Link
          className="flex shrink-0 items-center gap-2.5 sm:gap-3"
          href="/discover"
          aria-current="page"
          aria-label="BeSeen Discover"
        >
          <BrandLogo className="w-24 sm:w-31.5" />
          <span className="text-[20px] font-semibold leading-none tracking-[-0.035em] text-brand sm:text-[27px]">Discover</span>
        </Link>
        <span className="flex-1" />
        {status === "loading" ? (
          <span className="h-10 w-20 animate-pulse rounded-xl bg-disabled sm:w-31" aria-hidden="true" />
        ) : (
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-brand px-3 text-xs font-semibold text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#0c3bd6] sm:px-4 sm:text-sm"
            href={action.href}
            aria-label={action.label}
          >
            <span className="hidden min-[480px]:inline">{action.label}</span>
            <span className="min-[480px]:hidden">{action.compactLabel}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
