"use client";

import {
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  Radio,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { cn, shortenAddress } from "@/lib/utils";
import { useProfile } from "@/providers/profile-provider";

const navigationItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/dashboard/messenger", label: "Messenger", icon: MessageCircleMore },
  { href: "/dashboard/profile", label: "Creator Profile", icon: UserRound },
];

type NavigationProps = {
  close?: () => void;
  onLogout: () => void;
};

export function Navigation({ close, onLogout }: NavigationProps) {
  const pathname = usePathname();
  const { profile } = useProfile();

  return (
    <>
      <div className="h-17.5 px-3 py-1">
        <BrandLogo className="max-[900px]:origin-left max-[900px]:scale-[0.86]" />
      </div>
      <nav className="mt-5.5 grid gap-1.25" aria-label="Main navigation">
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
                "relative flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-secondary transition-[background,color] duration-150 hover:bg-subtle hover:text-navy",
                active &&
                  "bg-info-bg text-brand before:absolute before:left-0 before:h-5 before:w-0.75 before:rounded-r before:bg-brand",
              )}
              aria-current={active ? "page" : undefined}
              key={item.href}
              onClick={close}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border pt-5">
        <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
          <Avatar
            username={profile?.username || null}
            src={profile?.avatarUrl}
            size="sm"
          />
          <div className="flex min-w-0 flex-col">
            <strong className="overflow-hidden text-ellipsis text-[13px]">
              @{profile?.username || "creator"}
            </strong>
            <span className="text-[10px] text-muted">
              {shortenAddress(profile?.walletAddress || "")}
            </span>
          </div>
        </div>
        <button
          className="flex min-h-10.5 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-[13px] font-semibold text-secondary hover:bg-error-bg hover:text-error"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </>
  );
}
