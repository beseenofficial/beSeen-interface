export function DiscoverSkeleton() {
  return (
    <div
      className="relative flex min-h-[330px] animate-pulse flex-col rounded-[24px] border border-[#d9e1f0] bg-white p-3"
      aria-hidden="true"
    >
      <span className="block h-28 w-full rounded-[16px] bg-disabled" />
      <span className="-mt-10 ml-4 block size-21 rounded-full border-4 border-white bg-disabled" />
      <div className="mt-3 space-y-3 px-4">
        <span className="block h-6 w-2/3 rounded bg-disabled" />
        <span className="block h-3 w-full rounded bg-disabled/70" />
        <span className="block h-3 w-4/5 rounded bg-disabled/70" />
      </div>
      <div className="mt-auto flex items-end justify-between px-4 pb-3">
        <span className="h-10 w-28 rounded bg-disabled/70" />
        <span className="size-11 rounded-full bg-disabled" />
      </div>
    </div>
  );
}
