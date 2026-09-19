import { LoaderCircle, MessageCircleMore } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

export interface RecentMessageItem {
  conversationId: string;
  username: string;
  avatar: string | null;
  content: string;
  timestamp: string;
  occurredAt: string;
  unreadCount: number;
  isOwn: boolean;
}

interface RecentMessagesProps {
  messages: RecentMessageItem[];
  loading?: boolean;
}

export function RecentMessages({ messages, loading = false }: RecentMessagesProps) {
  return (
    <article className="overview-recent-card rounded-2xl border border-border bg-white p-6 max-sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Recent messages</h2>
        <Link className="text-sm font-semibold text-brand" href="/dashboard/messenger">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="overview-recent-empty grid min-h-56 place-items-center text-secondary" role="status">
          <LoaderCircle className="animate-spin" size={25} aria-hidden="true" />
          <span className="sr-only">Loading recent messages</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="overview-recent-empty grid min-h-56 place-items-center text-center">
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-bg text-brand">
              <MessageCircleMore size={25} />
            </span>
            <strong className="mt-3 block text-sm">No messages yet</strong>
            <p className="mt-1 text-xs text-muted">Messages from others will appear here.</p>
          </div>
        </div>
      ) : (
        <ul className="overview-recent-list mt-2 divide-y divide-border">
          {messages.map((message) => (
            <li key={message.conversationId}>
              <Link
                className="flex min-h-17 items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-subtle focus-visible:outline-offset-1"
                href={`/dashboard/messenger?conversation=${encodeURIComponent(message.conversationId)}`}
                aria-label={`Open conversation with @${message.username}`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${message.unreadCount > 0 ? 'bg-brand' : 'bg-border'}`}
                  aria-hidden="true"
                />
                <Avatar username={message.username} src={message.avatar} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong className="block truncate text-xs">@{message.username}</strong>
                    {message.unreadCount > 0 && (
                      <span className="inline-flex min-w-4.5 items-center justify-center rounded-full bg-brand px-1.5 text-[9px] leading-4.5 font-semibold text-white">
                        {message.unreadCount > 99 ? '99+' : message.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className={`mt-0.5 block truncate text-xs ${message.unreadCount > 0 ? 'font-medium text-navy' : 'text-secondary'}`}>
                    {message.isOwn && <span className="text-muted">You: </span>}
                    {message.content}
                  </span>
                </span>
                <time className="shrink-0 self-start pt-1 text-[10px] text-muted">{message.timestamp}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
