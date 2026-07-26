import Link from "next/link";
import { AuraRipple } from "@/components/ui/aura-ripple";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-hidden p-8 text-center">
      <AuraRipple className="absolute" tone="lilac" />
      <span className="relative z-1 mb-2 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">404</span>
      <h1 className="relative z-1 text-[42px]">This page is outside your Aura.</h1>
      <p className="relative z-1 mb-6 mt-3.5 text-secondary">The page you’re looking for does not exist.</p>
      <Link className="relative z-1 inline-flex min-h-11.5 items-center justify-center gap-2.25 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-[#0c3bd6]" href="/dashboard">
        Back to overview
      </Link>
    </main>
  );
}
