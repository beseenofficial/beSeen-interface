import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "lilac";
}) {
  const tones = {
    success: "bg-success-bg text-success",
    info: "bg-info-bg text-brand",
    warning: "bg-warning-bg text-warning",
    lilac: "bg-[#f0edff] text-[#5a49bd]",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-7 w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
