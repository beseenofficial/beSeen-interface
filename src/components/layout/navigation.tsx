"use client";

import {
  ChevronDown,
  ExternalLink,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  PencilLine,
  Radio,
  Settings,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/lib/blux";
import { cn } from "@/lib/utils";

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
  const { user, address, openWalletProfile, fundWallet } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenu = useRef<HTMLDivElement>(null);
  const navigationItems = [
    ...baseNavigationItems,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ];

  useEffect(() => {
    if (!profileOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!profileMenu.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  const runWalletAction = (action: () => void) => {
    setProfileOpen(false);
    close?.();
    action();
  };

  return (
    <>
      <div className="h-19 px-4 py-0.5">
        <BrandLogo className="w-33 max-[900px]:origin-left max-[900px]:scale-[0.86]" />
      </div>
      <nav className="mt-3 grid gap-2" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              href={item.href}
              className={cn(
                "relative flex min-h-15 items-center gap-3.5 rounded-2xl px-5 text-sm font-semibold transition-[background,color] duration-150",
                active ? "bg-info-bg text-brand" : "text-secondary hover:bg-subtle hover:text-navy",
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
        <span className="flex min-h-15 items-center gap-3.5 rounded-2xl px-5 text-sm font-semibold text-secondary" aria-disabled="true">
          <Settings size={21} strokeWidth={1.8} />
          <span>Settings</span>
        </span>
      </nav>

      <div className="relative mt-auto pt-6 max-[900px]:mt-8" ref={profileMenu}>
        {profileOpen && (
          <div className="absolute bottom-[88px] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-elevated" role="menu" aria-label="Profile actions">
            <button className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-secondary hover:bg-subtle hover:text-navy" onClick={() => runWalletAction(openWalletProfile)} role="menuitem" type="button">
              <WalletCards size={17} /> Wallet profile
            </button>
            <button className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-secondary hover:bg-subtle hover:text-navy" onClick={() => runWalletAction(fundWallet)} role="menuitem" type="button">
              <HandCoins size={17} /> Fund wallet
            </button>
            <Link className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-secondary hover:bg-subtle hover:text-navy" href={`/u/${user?.username || ""}`} onClick={() => { setProfileOpen(false); close?.(); }} role="menuitem">
              <ExternalLink size={17} /> View public profile
            </Link>
            <Link className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-secondary hover:bg-subtle hover:text-navy" href="/dashboard/profile" onClick={() => { setProfileOpen(false); close?.(); }} role="menuitem">
              <PencilLine size={17} /> Edit profile
            </Link>
            <div className="my-1 border-t border-border" />
            <button className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-secondary hover:bg-error-bg hover:text-error" onClick={onLogout} role="menuitem" type="button">
              <LogOut size={17} /> Log out
            </button>
          </div>
        )}
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 text-left transition hover:border-brand/25 hover:bg-subtle" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen((current) => !current)} type="button">
          <Avatar username={user?.username || null} src={user?.avatar} size="sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="overflow-hidden text-ellipsis text-xs">@{user?.username || "creator"}</strong>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
              <i className="size-2 rounded-full bg-emerald-500" />
              {address ? "Online" : "Secure session"}
            </span>
          </span>
          <ChevronDown className={cn("shrink-0 transition-transform", profileOpen && "rotate-180")} size={17} />
        </button>
      </div>
    </>
  );
}
