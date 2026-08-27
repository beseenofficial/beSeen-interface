import { cn, initials } from "@/lib/utils";

export function Avatar({
  username,
  src,
  size = "md",
  className,
}: {
  username: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  className?: string;
}) {
  const sizes = {
    sm: "size-10 text-[13px]",
    md: "size-12 text-sm",
    lg: "size-18 text-xl",
    xl: "size-24 text-[26px]",
    xxl: "size-32 text-[42px]",
  };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-peach font-bold text-navy",
        sizes[size],
        className,
      )}
      aria-label={`${username || "Creator"} avatar`}
    >
      {initials(username)}
      {src && (
        <img
          className="absolute inset-0 size-full object-cover"
          src={src}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
