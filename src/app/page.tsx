"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/blux";

export default function Home() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(
      status === "ready"
        ? "/dashboard"
        : status === "needs-username"
          ? "/onboarding"
          : "/login",
    );
  }, [router, status]);

  return null;
}
