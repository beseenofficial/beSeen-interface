export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

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
