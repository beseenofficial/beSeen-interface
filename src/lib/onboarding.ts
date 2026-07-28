import { RESERVED_USERNAMES } from "@/lib/constants";

export function validateUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  return (
    normalized.length >= 3 &&
    normalized.length <= 30 &&
    /^[a-z0-9_]+$/.test(normalized) &&
    !RESERVED_USERNAMES.includes(
      normalized as (typeof RESERVED_USERNAMES)[number],
    )
  );
}

export function signingErrorMessage(cause: unknown) {
  const message =
    cause instanceof Error ? cause.message : "The signing request failed.";
  if (/reject|declin|cancel/i.test(message)) {
    return "The signing request was canceled. Approve it in Blux and try again.";
  }
  if (/testnet/i.test(message)) return message;
  if (/timeout/i.test(message)) {
    return "The signing request timed out. Check Blux and try again.";
  }
  return message;
}
