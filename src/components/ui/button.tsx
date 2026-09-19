import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "inverted" | "invertedSecondary";
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  loading,
  icon,
  children,
  disabled,
  ...props
}: Props) {
  const variants = {
    primary: "bg-brand text-white hover:bg-[#0c3bd6]",
    secondary:
      "border-border bg-white text-navy hover:border-[#a9c2ca] hover:bg-subtle",
    tertiary: "bg-transparent px-3 text-brand hover:bg-info-bg",
    inverted: "bg-white text-navy hover:bg-aqua",
    invertedSecondary:
      "border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11.5 cursor-pointer items-center justify-center gap-2.25 rounded-xl border border-transparent px-5 font-semibold transition-[background-color,border-color,transform] duration-160 hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="animate-spin" size={18} aria-hidden />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
