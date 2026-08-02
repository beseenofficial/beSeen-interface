"use client";

import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageCircleMore,
  Radio,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/lib/blux";
import { cn, shortenAddress } from "@/lib/utils";

const baseNavigationItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/dashboard/messenger", label: "Messenger", icon: MessageCircleMore },
];

type NavigationProps = {
  close?: () => void;
  onLogout: () => void;
};

export function Navigation({ close, onLogout }: NavigationProps) {
  const pathname = usePathname();
  const { user, address } = useAuth();
  const navigationItems = [
    ...baseNavigationItems,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <>
      <div className="h-19 px-2 py-0.5">
        <BrandLogo className="w-33 max-[900px]:origin-left max-[900px]:scale-[0.86]" />
      </div>
      <nav className="mt-3 grid gap-1.5" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              href={item.href}
              className={cn(
                "relative flex min-h-12.5 items-center gap-3.5 rounded-xl px-3.5 text-sm font-semibold transition-[background,color] duration-150",
                active
                  ? "bg-info-bg text-brand before:absolute before:-left-2 before:h-6 before:w-0.75 before:rounded-r before:bg-brand"
                  : "text-secondary hover:bg-subtle hover:text-navy",
              )}
              aria-current={active ? "page" : undefined}
              key={item.href}
              onClick={close}
            >
              <Icon size={21} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <span className="flex min-h-12.5 items-center gap-3.5 rounded-xl px-3.5 text-sm font-semibold text-secondary" aria-disabled="true">
          <Settings size={21} strokeWidth={1.8} />
          <span>Settings</span>
        </span>
      </nav>

      <div className="mt-auto rounded-2xl border border-[#d9ddff] bg-[#fbfbff] p-4 max-[900px]:mt-8">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac/55 text-brand">
            <LifeBuoy size={21} />
          </span>
          <div>
            <strong className="text-sm">Need help?</strong>
            <p className="mt-1 text-[11px] leading-4.5 text-muted">Visit our Help Center for guides and support.</p>
          </div>
        </div>
        <a href="#help" className="mt-3 flex items-center gap-2 pl-13 text-xs font-semibold text-brand hover:underline">
          Open Help Center <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center gap-3 px-1 pb-4">
          <Avatar
            username={user?.username || null}
            src={user?.avatar}
            size="md"
          />
          <div className="flex min-w-0 flex-col">
            <strong className="overflow-hidden text-ellipsis text-sm">
              @{user?.username || "creator"}
            </strong>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
              <i className="size-2 rounded-full bg-emerald-500" />
              {address ? shortenAddress(address) : "Secure session"}
            </span>
          </div>
        </div>
        <button
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-3.5 text-[13px] font-semibold text-secondary transition hover:border-error/30 hover:bg-error-bg hover:text-error"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </>
  );
}
