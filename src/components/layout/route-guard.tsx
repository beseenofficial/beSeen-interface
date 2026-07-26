"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasEncryptedPrivateKey } from "@/lib/crypto/key-storage";
import { requiredRoute } from "@/lib/onboarding";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/providers/profile-provider";
import { ErrorState, LoadingState } from "@/components/ui/states";

type Mode = "login" | "onboarding" | "app";

const SESSION_RESOLUTION_TIMEOUT_MS = 8_000;

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
  const { profile, loading, error, refresh } = useProfile();
  const [checkingDeviceKey, setCheckingDeviceKey] = useState(false);
  const [allowed, setAllowed] = useState(mode === "login");
  const [guardError, setGuardError] = useState<string | null>(null);

  useEffect(() => {
    const unresolvedSession =
      auth.isReady &&
      auth.isAuthenticated &&
      (!auth.address || (!loading && !profile));
    if (!unresolvedSession) {
      setGuardError(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setGuardError(
        !auth.address
          ? "Your sign-in session is missing an account address. Please sign out and try again."
          : "We could not load your creator profile. Please try again.",
      );
    }, SESSION_RESOLUTION_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [
    auth.address,
    auth.isAuthenticated,
    auth.isReady,
    loading,
    profile,
  ]);

  useEffect(() => {
    let active = true;

    async function resolve() {
      if (!auth.isReady) {
        if (mode === "login") setAllowed(true);
        return;
      }

      if (!auth.isAuthenticated) {
        if (mode === "login") {
          setAllowed(true);
        } else {
          setAllowed(false);
          router.replace("/login");
        }
        return;
      }

      if (!auth.address || loading || !profile) return;

      setCheckingDeviceKey(true);
      let hasDeviceKey = false;
      try {
        hasDeviceKey =
          profile.messagingKeyConfigured &&
          (await hasEncryptedPrivateKey(profile.id));
      } catch (cause) {
        if (!active) return;
        setGuardError(
          cause instanceof Error
            ? cause.message
            : "Secure storage could not be checked.",
        );
        setAllowed(false);
        setCheckingDeviceKey(false);
        return;
      }
      if (!active) return;
      setCheckingDeviceKey(false);

      const destination = requiredRoute({
        authenticated: true,
        profile,
        hasDeviceKey,
      })!;

      const correct =
        (pathname === "/onboarding/security" &&
          destination === "/onboarding/security") ||
        (pathname === "/onboarding/profile" &&
          destination === "/onboarding/profile") ||
        (mode === "app" && destination === "/dashboard");

      if (correct) {
        setAllowed(true);
      } else {
        setAllowed(false);
        router.replace(destination);
      }
    }

    void resolve();
    return () => {
      active = false;
    };
  }, [
    auth.address,
    auth.isAuthenticated,
    auth.isReady,
    loading,
    mode,
    pathname,
    profile,
    router,
  ]);

  const displayedError = error ?? guardError;
  if (displayedError) {
    return (
      <ErrorState
        message={displayedError}
        retry={() => {
          setGuardError(null);
          void refresh();
        }}
      />
    );
  }

  // Keep an already-authorized page visible during background profile refreshes.
  if (
    !allowed ||
    (mode !== "login" && !auth.isReady) ||
    (!allowed && (loading || checkingDeviceKey))
  ) {
    return <LoadingState label="Preparing your BeSeen experience…" />;
  }
  return children;
}
