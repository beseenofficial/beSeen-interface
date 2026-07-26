"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { LoadingState } from "@/components/ui/states";
import { AuthProvider } from "./auth-provider";
import { ProfileProvider } from "./profile-provider";
import { ToastProvider } from "./toast-provider";

const BluxRuntime = dynamic(() => import("./blux-runtime"), {
  ssr: false,
  loading: () => <LoadingState label="Preparing secure sign-in…" />,
});

function DemoProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ToastProvider>{children}</ToastProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default function RuntimeProviders({ children }: { children: ReactNode }) {
  const isDemo =
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" ||
    !process.env.NEXT_PUBLIC_BLUX_APP_ID;
  if (isDemo) return <DemoProviders>{children}</DemoProviders>;
  return <BluxRuntime>{children}</BluxRuntime>;
}
