// Where shareable profile links point. NEXT_PUBLIC_APP_URL wins; without it
// the app falls back to whatever origin it is actually served from.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000");

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "api",
  "beseen",
  "me",
  "moderator",
  "root",
  "support",
  "system",
] as const;
