import { cn } from '@/lib/utils';

export function ValueSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-pulse rounded bg-[#eef3f6]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function InlineStat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      {loading ? (
        <ValueSkeleton className="h-4 w-7 translate-y-[-1px]" />
      ) : (
        <strong className="font-semibold tabular-nums text-navy">
          {value === undefined ? '—' : value.toLocaleString()}
        </strong>
      )}
      <span className="text-secondary">{label}</span>
    </span>
  );
}

export function SignalMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'public-profile-signal-mark inline-block shrink-0 bg-brand',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function ActivityRegisterRow({
  label,
  value,
  unit,
  isEmpty = false,
}: {
  label: string;
  value: string;
  unit?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="grid min-h-10 min-w-0 grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5">
      <span
        className="mt-[9px] block h-px w-2 bg-[#b9c9d6]"
        aria-hidden="true"
      />
      <span className="text-[13px] font-medium leading-5 text-secondary">
        {label}
      </span>
      <strong
        className={cn(
          'text-right text-[14px] leading-5 tabular-nums tracking-[-0.01em]',
          isEmpty ? 'font-normal text-muted/75' : 'font-semibold text-navy',
        )}
      >
        {isEmpty ? (
          'None yet'
        ) : (
          <>
            {value}
            {unit ? (
              <span className="ml-1 text-[10px] font-medium text-muted">
                {unit}
              </span>
            ) : null}
          </>
        )}
      </strong>
    </div>
  );
}
