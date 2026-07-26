"use client";

import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/providers/profile-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LoadingState } from "@/components/ui/states";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const auth = useAuth();
  const router = useRouter();
  const { profile } = useProfile();

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  if (!profile) return <LoadingState />;

  const onLogout = () => {
    auth.logout();
    setOpen(false);
    router.replace("/login");
  };

  return (
    <div className="min-h-screen pl-62 max-[900px]:pl-0 max-[900px]:pt-17">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-62 flex-col border-r border-border bg-white px-4.5 pb-5 pt-6.5 max-[900px]:hidden">
        <Navigation onLogout={onLogout} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 hidden h-17 items-center justify-between border-b border-border bg-white px-5 max-[900px]:flex">
        <BrandLogo className="origin-left scale-[0.86]" />
        <button
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-subtle"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
      </header>
      {open && (
        <div
          className="fixed inset-0 z-50 block bg-navy/[0.28]"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] animate-[drawer-in_220ms_ease_both] flex-col bg-white px-4.5 pb-5 pt-6 shadow-elevated"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButton}
              className="absolute right-4.5 top-5 inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-subtle"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X />
            </button>
            <Navigation close={() => setOpen(false)} onLogout={onLogout} />
          </aside>
        </div>
      )}
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
