import { cn, initials } from "@/lib/utils";

export function Avatar({
  username,
  src,
  size = "md",
}: {
  username: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "size-10 text-[13px]",
    md: "size-12 text-sm",
    lg: "size-18 text-xl",
    xl: "size-24 text-[26px]",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-peach font-bold text-navy",
        sizes[size],
      )}
      aria-label={`${username || "Creator"} avatar`}
    >
      {src ? <img className="size-full object-cover" src={src} alt="" /> : initials(username)}
    </span>
  );
}
