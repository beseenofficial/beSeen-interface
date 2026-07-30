import { AlertCircle, Inbox, LoaderCircle, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Button } from "./button";

export function SecureLoadingScreen({
  label = "Preparing your secure BeSeen experience…",
}: {
  label?: string;
}) {
  return (
    <main
      className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-ice px-5 py-8 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(100,221,234,0.2),transparent_34%),radial-gradient(circle_at_82%_86%,rgba(200,190,255,0.25),transparent_36%)]"
        aria-hidden="true"
      />
      <img
        className="pointer-events-none absolute right-[-18rem] top-1/2 w-[64rem] -translate-y-1/2 opacity-45"
        src="/brand/beseen-aura-orbits-background.svg"
        alt=""
        aria-hidden="true"
      />

      <section className="relative flex min-h-105 w-full max-w-110 flex-col items-center justify-center overflow-hidden rounded-[30px] border border-white/80 bg-white/88 px-7 py-9 shadow-[0_24px_70px_rgba(11,11,63,0.1)] backdrop-blur-xl sm:px-10">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aqua via-brand to-lilac"
          aria-hidden="true"
        />

        <BrandLogo className="mb-8 w-28" />

        <div className="relative mb-7 grid size-24 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-brand/10" />
          <span className="absolute inset-2 animate-[spin_2.4s_linear_infinite] rounded-full border-2 border-transparent border-r-aqua border-t-brand" />
          <span className="absolute inset-4 animate-[secure-loader-breathe_2s_ease-in-out_infinite] rounded-full bg-brand/8" />
          <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_10px_28px_rgba(16,69,245,0.28)]">
            <ShieldCheck size={23} strokeWidth={2.2} />
          </span>
        </div>

        <h1 className="text-[1.35rem] font-semibold text-navy">
          Securing your session
        </h1>
        <div className="mt-2 flex h-13 w-full items-center justify-center px-2">
          <p className="max-w-82 text-sm leading-5 text-secondary">{label}</p>
        </div>

        <div
          className="mt-5 h-1.5 w-52 overflow-hidden rounded-full bg-disabled"
          aria-hidden="true"
        >
          <span className="block h-full w-2/5 rounded-full bg-gradient-to-r from-aqua via-brand to-lilac [animation:secure-loader-progress_1.8s_ease-in-out_infinite]" />
        </div>
        <p className="mt-5 text-xs text-muted">
          Your private keys stay on this device.
        </p>
      </section>
    </main>
  );
}

export function LoadingState({ label = "Loading BeSeen…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center text-secondary" role="status">
      <LoaderCircle className="animate-spin" size={28} aria-hidden />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="mx-auto my-20 flex min-h-65 max-w-140 flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-white p-10 text-center text-secondary" role="alert">
      <AlertCircle className="text-error" size={28} />
      <h2 className="text-navy">Something needs your attention</h2>
      <p>{message}</p>
      {retry && <Button onClick={retry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-57.5 flex-col items-center justify-center gap-3 text-center text-secondary">
      <span className="grid size-12 place-items-center rounded-full bg-[#f0edff] text-[#6555bd]"><Inbox size={23} /></span>
      <h3 className="text-navy">{title}</h3>
      <p className="max-w-85 text-sm">{message}</p>
    </div>
  );
}
