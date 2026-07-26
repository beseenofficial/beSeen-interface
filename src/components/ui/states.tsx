import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "./button";

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
