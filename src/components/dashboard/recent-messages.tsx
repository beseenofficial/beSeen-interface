import { MessageCircleMore } from 'lucide-react';
import Link from 'next/link';

interface RecentMessagesProps {
  hasMessages: boolean;
}

export function RecentMessages({ hasMessages }: RecentMessagesProps) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5.5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent messages</h2>
        <Link
          className="text-sm font-semibold text-brand"
          href="/dashboard/messenger"
        >
          View all
        </Link>
      </div>
      {hasMessages ? (
        <div className="mt-3">{/* Messages list will go here */}</div>
      ) : (
        <div className="grid min-h-40 place-items-center text-center">
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-bg text-brand">
              <MessageCircleMore size={25} />
            </span>
            <strong className="mt-3 block text-sm">No messages yet</strong>
            <p className="mt-1 text-xs text-muted">
              Messages from others will appear here.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
