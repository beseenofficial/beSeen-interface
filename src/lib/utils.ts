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

export function initials(username: string | null) {
  return (username?.slice(0, 2) || "BS").toUpperCase();
}
