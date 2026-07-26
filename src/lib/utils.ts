export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function shortenAddress(address: string) {
  return address.length > 14
    ? `${address.slice(0, 7)}…${address.slice(-5)}`
    : address;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function initials(username: string | null) {
  return (username?.slice(0, 2) || "BS").toUpperCase();
}

export function sanitizeBroadcast(content: string) {
  return content.replace(/\u0000/g, "").trim();
}
