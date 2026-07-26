import type { CreatorProfile } from "@/types";

export function requiredRoute({
  authenticated,
  profile,
  hasDeviceKey,
}: {
  authenticated: boolean;
  profile: CreatorProfile | null;
  hasDeviceKey: boolean;
}) {
  if (!authenticated) return "/login";
  if (!profile) return null;
  if (!profile.messagingKeyConfigured || !hasDeviceKey) {
    return "/onboarding/security";
  }
  if (!profile.username || !profile.onboardingCompleted) {
    return "/onboarding/profile";
  }
  return "/dashboard";
}

export function validateUsername(username: string) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(username);
}

export function signingErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message.toLowerCase() : "";
  if (message.includes("reject") || message.includes("cancel")) {
    return "You cancelled the signature request. Nothing was changed; you can try again.";
  }
  if (message.includes("support") || message.includes("unsupported")) {
    return "This wallet does not support message signing. Try another Blux sign-in method or wallet.";
  }
  if (message.includes("auth") || message.includes("session")) {
    return "Your sign-in session expired. Sign out, then sign in again.";
  }
  return "We couldn’t create your messaging key. Please try again.";
}
