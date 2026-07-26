import type { ReactNode } from "react";
import { RouteGuard } from "@/components/layout/route-guard";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <RouteGuard mode="onboarding">{children}</RouteGuard>;
}
