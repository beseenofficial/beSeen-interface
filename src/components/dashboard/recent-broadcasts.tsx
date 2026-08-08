import { LoaderCircle, Radio } from 'lucide-react';
import Link from 'next/link';
import { BroadcastPreview } from '@/components/broadcasts/broadcast-preview';
import { Avatar } from '@/components/ui/avatar';

export interface BroadcastItem {
  id: string;
  content: string;
  username: string;
  avatar: string | null;
  timestamp: string;
  publishedAt: string;
  isOwn: boolean;
  recipientCount: number;
}

interface RecentBroadcastsProps {
  broadcasts: BroadcastItem[];
  loading?: boolean;
}

export function RecentBroadcasts({ broadcasts, loading = false }: RecentBroadcastsProps) {
  return (
    <article className="overview-recent-card rounded-2xl border border-border bg-white p-6 max-sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Recent broadcasts</h2>
        <Link className="text-sm font-semibold text-brand" href="/dashboard/broadcasts">View all</Link>
      </div>
      {loading ? (
        <div className="overview-recent-empty grid min-h-56 place-items-center text-secondary" role="status">
          <LoaderCircle className="animate-spin" size={25} aria-hidden="true" />
          <span className="sr-only">Loading recent broadcasts</span>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="overview-recent-empty grid min-h-56 place-items-center text-center">
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-bg text-brand"><Radio size={25} /></span>
            <strong className="mt-3 block text-sm">No broadcasts yet</strong>
            <p className="mt-1 max-w-60 text-xs text-muted">Broadcasts you receive will appear here.</p>
          </div>
        </div>
      ) : (
        <ul className="overview-recent-list mt-2 divide-y divide-border">
          {broadcasts.map((broadcast) => (
            <li key={broadcast.id} className="flex min-h-17 items-center gap-3 py-2.5">
              <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <Avatar username={broadcast.username} src={broadcast.avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs">@{broadcast.username}</strong>
                <BroadcastPreview
                  className="mt-0.5 text-xs text-secondary"
                  content={broadcast.content}
                  username={broadcast.username}
                  avatar={broadcast.avatar}
                  publishedAt={broadcast.publishedAt}
                  isOwn={broadcast.isOwn}
                  recipientCount={broadcast.recipientCount}
                />
              </span>
              <time className="shrink-0 text-[10px] text-muted">{broadcast.timestamp}</time>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
