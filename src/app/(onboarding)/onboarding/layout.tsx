import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RouteGuard } from "@/components/layout/route-guard";

export const metadata: Metadata = {
  title: "Create your profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <RouteGuard mode="onboarding">{children}</RouteGuard>;
}
