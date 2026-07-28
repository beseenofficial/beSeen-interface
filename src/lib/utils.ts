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

// Logos are stored as data URLs (the mock API lives in localStorage), so the
// file has to stay small.
const MAX_LOGO_BYTES = 512 * 1024;

export function readLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file for your logo."));
  }
  if (file.size > MAX_LOGO_BYTES) {
    return Promise.reject(new Error("Logos must be smaller than 512 KB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("The logo file could not be read. Try another file."));
    reader.readAsDataURL(file);
  });
}
