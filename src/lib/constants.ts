export const BESEEN_MESSAGING_KEY_MESSAGE = [
  "BeSeen Messenger Key Setup",
  "Version: 1",
  "Purpose: Create your private messaging encryption key.",
  "This signature does not authorize a transaction or move funds.",
  "Domain: beseen.fi",
].join("\n");

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://beseen.fi";

export const DEMO_ADDRESS =
  "GCJ7XZIWQBPLFMK6FFWB6V5BWX46GD2KPYOJ6LZ7MRYG2LQFM4BSEEN";
