"use client";

import {
  ChevronDown,
  CircleDollarSign,
  Compass,
  ExternalLink,
  HandCoins,
  House,
  LogOut,
  MessageCircleMore,
  PencilLine,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/lib/blux";
import { cn } from "@/lib/utils";

const baseNavigationItems = [
  { href: "/dashboard/discover", label: "Discover", icon: Compass },
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/dashboard/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/dashboard/messenger", label: "Messenger", icon: MessageCircleMore },
];

type NavigationProps = {
  close?: () => void;
  onLogout: () => void;
};

export function Navigation({ close, onLogout }: NavigationProps) {
  const pathname = usePathname();
  const { user, openWalletProfile, fundWallet } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenu = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const firstProfileAction = useRef<HTMLAnchorElement>(null);
  const profileMenuId = useId();
  const navigationItems = [
    ...baseNavigationItems,
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ];

  useEffect(() => {
    if (!profileOpen) return;
    const focusFrame = window.requestAnimationFrame(() => firstProfileAction.current?.focus());
    const closeMenu = (event: MouseEvent) => {
      if (!profileMenu.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileButton.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  useEffect(() => setProfileOpen(false), [pathname]);

  const runWalletAction = (action: () => void) => {
    setProfileOpen(false);
    close?.();
    action();
  };

  return (
    <>
      <div className="h-17 px-3 py-0.5">
        <BrandLogo className="w-31 max-[900px]:origin-left max-[900px]:scale-[0.86]" />
      </div>
      <nav className="grid gap-1" aria-label="Main navigation">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Fragment key={item.href}>
              {index === 1 && (
                <div className="mx-3 mb-1 mt-2 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted" aria-hidden>
                  Workspace
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-12.5 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-[background-color,color] duration-150 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:content-['']",
                  active
                    ? "bg-info-bg text-brand before:bg-brand"
                    : "text-secondary before:bg-transparent hover:bg-subtle hover:text-navy",
                )}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors", active && "bg-white/75")} aria-hidden>
                  <Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
                </span>
                <span>{item.label}</span>
              </Link>
            </Fragment>
          );
        })}
      </nav>
      <div className="relative mx-1 mt-auto border-t border-border pt-4" ref={profileMenu}>
        <button
          ref={profileButton}
          className={cn(
            "group flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 hover:border-brand/15 hover:bg-info-bg/55",
            profileOpen && "border-brand/20 bg-info-bg shadow-[0_8px_24px_-16px_rgb(16_69_245/45%)]",
          )}
          aria-controls={profileMenuId}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          onClick={() => setProfileOpen((current) => !current)}
          type="button"
        >
          <Avatar className="size-10 ring-2 ring-white" username={user?.username || null} src={user?.avatar} size="sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="truncate text-sm font-semibold tracking-[-0.01em]">@{user?.username || "creator"}</strong>
            <span className="mt-0.5 truncate text-[11px] leading-4 text-muted">Profile &amp; wallet</span>
          </span>
          <span className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-secondary transition-[background-color,color] group-hover:bg-white group-hover:text-brand",
            profileOpen && "bg-white text-brand",
          )} aria-hidden>
            <ChevronDown className={cn("transition-transform duration-150", profileOpen && "rotate-180")} size={16} strokeWidth={2} />
          </span>
        </button>
        {profileOpen && (
          <div
            className="absolute bottom-[72px] left-0 right-0 z-30 overflow-hidden rounded-2xl bg-white p-2 shadow-floating"
            id={profileMenuId}
            role="menu"
            aria-label="Profile and wallet actions"
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted" aria-hidden>Profile</div>
            <Link ref={firstProfileAction} className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-xs font-semibold text-secondary transition-colors hover:bg-subtle hover:text-navy" href={`/u/${user?.username || ""}`} onClick={() => { setProfileOpen(false); close?.(); }} role="menuitem">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-bg text-brand"><ExternalLink size={16} /></span>
              <span className="min-w-0 flex-1">View public profile</span>
            </Link>
            <Link className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-xs font-semibold text-secondary transition-colors hover:bg-subtle hover:text-navy" href="/dashboard/profile" onClick={() => { setProfileOpen(false); close?.(); }} role="menuitem">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0edff] text-[#6555bd]"><PencilLine size={16} /></span>
              <span className="min-w-0 flex-1">Edit profile</span>
            </Link>

            <div className="mx-2 my-1.5 border-t border-border" />
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted" aria-hidden>Wallet</div>
            <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-left text-xs font-semibold text-secondary transition-colors hover:bg-subtle hover:text-navy" onClick={() => runWalletAction(openWalletProfile)} role="menuitem" type="button">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success-bg text-success"><WalletCards size={16} /></span>
              <span className="min-w-0 flex-1">Wallet profile</span>
            </button>
            <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-left text-xs font-semibold text-secondary transition-colors hover:bg-subtle hover:text-navy" onClick={() => runWalletAction(fundWallet)} role="menuitem" type="button">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-bg text-warning"><HandCoins size={16} /></span>
              <span className="min-w-0 flex-1">Fund wallet</span>
            </button>

            <div className="mx-2 my-1.5 border-t border-border" />
            <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-left text-xs font-semibold text-secondary transition-colors hover:bg-error-bg hover:text-error" onClick={onLogout} role="menuitem" type="button">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-error-bg text-error"><LogOut size={16} /></span>
              <span className="min-w-0 flex-1">Log out</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
