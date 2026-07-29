import { LoaderCircle, Radio } from 'lucide-react';
import Link from 'next/link';

export interface BroadcastItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  iconBg: string;
}

interface RecentBroadcastsProps {
  broadcasts: BroadcastItem[];
  loading?: boolean;
}

export function RecentBroadcasts({ broadcasts, loading = false }: RecentBroadcastsProps) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5.5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent broadcasts</h2>
        <Link
          className="text-sm font-semibold text-brand"
          href="/dashboard/broadcasts"
        >
          View all
        </Link>
      </div>
      {loading ? (
        <div className="grid min-h-40 place-items-center text-secondary" role="status">
          <LoaderCircle className="animate-spin" size={25} aria-hidden="true" />
          <span className="sr-only">Loading recent broadcasts</span>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="grid min-h-40 place-items-center text-center">
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-bg text-brand">
              <Radio size={25} />
            </span>
            <strong className="mt-3 block text-sm">No broadcasts yet</strong>
            <p className="mt-1 text-xs text-muted">
              Your broadcasts will appear here.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {broadcasts.map((broadcast) => (
            <li key={broadcast.id} className="flex items-center gap-4 py-3.5">
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full ${broadcast.iconBg}`}
              >
                <Radio size={21} />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm">{broadcast.title}</strong>
                <span className="block truncate text-xs text-secondary">
                  {broadcast.description}
                </span>
                <time className="text-[11px] text-muted">
                  {broadcast.timestamp}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
