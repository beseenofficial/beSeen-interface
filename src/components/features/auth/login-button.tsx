"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginButton({
  onLogin,
  loading,
  isDemo,
}: {
  onLogin: () => void;
  loading: boolean;
  isDemo: boolean;
}) {
  return (
    <Button
      className="mt-7 w-full"
      onClick={onLogin}
      loading={loading}
      icon={<ArrowRight size={19} />}
    >
      {loading
        ? "Opening Blux…"
        : isDemo
          ? "Continue to demo"
          : "Continue with Blux"}
    </Button>
  );
}
