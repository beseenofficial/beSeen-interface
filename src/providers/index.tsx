"use client";

import type { ReactNode } from "react";
import RuntimeProviders from "./runtime-providers";

export function Providers({ children }: { children: ReactNode }) {
  return <RuntimeProviders>{children}</RuntimeProviders>;
}
