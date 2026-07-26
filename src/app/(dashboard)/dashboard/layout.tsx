import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/components/layout/route-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard mode="app">
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
