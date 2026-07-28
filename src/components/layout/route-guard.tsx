"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasLocalBeSeenKeys } from "@/lib/crypto/messaging-keys";
import { useAuth } from "@/providers/auth-provider";
import { ErrorState, LoadingState } from "@/components/ui/states";

type Mode = "login" | "onboarding" | "app";

export function RouteGuard({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [allowed, setAllowed] = useState(mode === "login");
  const [checkingKeys, setCheckingKeys] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function resolve() {
      setGuardError(null);
      if (!auth.isReady || auth.accountState === "loading") {
        if (active) setAllowed(mode === "login");
        return;
      }

      if (
        auth.accountState === "signed-out" ||
        auth.accountState === "provider-ready"
      ) {
        if (mode === "login") {
          setAllowed(true);
        } else {
          setAllowed(false);
          router.replace("/login");
        }
        return;
      }

      if (!auth.address) {
        setAllowed(false);
        setGuardError("Blux did not provide a Stellar account address.");
        return;
      }

      setCheckingKeys(true);
      let hasKeys = false;
      try {
        hasKeys = await hasLocalBeSeenKeys(auth.address);
      } catch (cause) {
        if (!active) return;
        setCheckingKeys(false);
        setAllowed(false);
        setGuardError(
          cause instanceof Error
            ? cause.message
            : "Secure key storage could not be checked.",
        );
        return;
      }
      if (!active) return;
      setCheckingKeys(false);

      if (auth.accountState === "unregistered") {
        const destination = hasKeys
          ? "/onboarding/profile"
          : "/onboarding/security";
        const correct =
          (pathname === "/onboarding/security" &&
            destination === "/onboarding/security") ||
          (pathname === "/onboarding/profile" &&
            destination === "/onboarding/profile");
        if (mode === "onboarding" && correct) {
          setAllowed(true);
        } else {
          setAllowed(false);
          router.replace(destination);
        }
        return;
      }

      if (auth.accountState === "registered") {
        if (!hasKeys) {
          if (pathname === "/onboarding/security") {
            setAllowed(true);
          } else {
            setAllowed(false);
            router.replace("/onboarding/security");
          }
          return;
        }
        if (mode === "app") {
          setAllowed(true);
        } else {
          setAllowed(false);
          router.replace("/dashboard");
        }
      }
    }

    void resolve();
    return () => {
      active = false;
    };
  }, [
    auth.accountState,
    auth.address,
    auth.isReady,
    mode,
    pathname,
    router,
  ]);

  if (guardError) {
    return (
      <ErrorState
        message={guardError}
        retry={() => {
          setGuardError(null);
          router.refresh();
        }}
      />
    );
  }
  if (!allowed || checkingKeys || !auth.isReady) {
    return <LoadingState label="Preparing your BeSeen experience…" />;
  }
  return children;
}
