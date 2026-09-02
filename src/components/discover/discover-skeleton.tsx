export function DiscoverSkeleton() {
  return (
    <div
      className="grid min-h-40 animate-pulse grid-cols-[88px_minmax(0,1fr)_96px] items-center gap-3 rounded-[24px] border border-[#d9e1f0] bg-white p-3"
      aria-hidden="true"
    >
      <span className="size-20 justify-self-center rounded-full bg-disabled" />
      <div className="min-w-0">
        <span className="block h-5 w-24 rounded bg-disabled" />
        <span className="mt-3 block h-4 w-20 rounded bg-disabled/80" />
        <span className="mt-3 block h-3 w-full rounded bg-disabled/70" />
        <span className="mt-2 block h-3 w-3/4 rounded bg-disabled/70" />
      </div>
      <span className="h-10 w-full rounded-xl bg-disabled" />
    </div>
  );
}
