"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginButton({
  onLogin,
  loading,
}: {
  onLogin: () => void;
  loading: boolean;
}) {
  return (
    <Button
      className="mt-7 w-full"
      onClick={onLogin}
      loading={loading}
      icon={<ArrowRight size={19} />}
    >
      {loading ? "Connecting to Testnet…" : "Continue with Blux"}
    </Button>
  );
}
