"use client";

import { Menu, X } from "lucide-react";
import {
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/blux";
import { BrandLogo } from "@/components/ui/brand-logo";
import { SecureLoadingScreen } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const auth = useAuth();
  const pathname = usePathname();
  const isMessenger = pathname === "/dashboard/messenger";

  if (!auth.user || !auth.keys) {
    return <SecureLoadingScreen label="Preparing your secure workspace…" />;
  }

  const onLogout = () => {
    setOpen(false);
    // RouteGuard notices the signed-out status and returns us to /login.
    auth.logout();
  };

  return (
    <div
      className={cn(
        "app-shell bg-ice pl-58 max-[900px]:pl-0 max-[900px]:pt-17",
        isMessenger ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <aside className="fixed inset-y-0 left-0 z-20 flex w-58 flex-col border-r border-border bg-white px-3 pb-3 pt-7 max-[900px]:hidden">
        <Navigation onLogout={onLogout} />
      </aside>
      <header className="app-mobile-header fixed inset-x-0 top-0 z-30 hidden h-17 items-center justify-start gap-2 border-b border-border bg-white px-4 max-[900px]:flex">
        <button
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent hover:bg-subtle"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
        <BrandLogo className="origin-left scale-[0.86]" />
      </header>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        placement="left"
        initialFocusRef={closeButton}
        ariaLabel="Navigation"
        overlayClassName="bg-navy/[0.28] backdrop-blur-none"
        className="flex h-full w-[min(300px,88vw)] flex-col border-r border-border bg-white px-4.5 pb-5 pt-6 shadow-[12px_0_36px_rgb(11_11_63/12%)]"
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
      </Modal>
      <main
        className={cn(
          "overflow-x-hidden bg-ice",
          isMessenger ? "h-full min-h-0 overflow-hidden" : "min-h-screen",
        )}
      >
        {children}
      </main>
    </div>
  );
}
