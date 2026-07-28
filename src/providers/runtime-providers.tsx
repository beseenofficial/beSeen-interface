"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { LoadingState } from "@/components/ui/states";

const BeSeenBluxProvider = dynamic(() => import("./blux-provider"), {
  ssr: false,
  loading: () => <LoadingState label="Preparing secure sign-in…" />,
});

export default function RuntimeProviders({
  children,
}: {
  children: ReactNode;
}) {
  return <BeSeenBluxProvider>{children}</BeSeenBluxProvider>;
}
