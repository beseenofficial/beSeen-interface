'use client';

import { CircleDollarSign, CircleMinus, LoaderCircle, MessageCircleMore, Radio, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { EarningTransaction } from '@/lib/api';
import type { BroadcastItem } from './recent-broadcasts';
import type { RecentMessageItem } from './recent-messages';

type ActivityItem = {
  id: string;
  kind: 'Message' | 'Broadcast' | 'Earning';
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  iconClass: string;
  title: string;
  detail: string;
  occurredAt: string;
  href: string;
  unread?: boolean;
};

function relativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const ranges = [['day', 86400], ['hour', 3600], ['minute', 60]] as const;
  for (const [unit, amount] of ranges) {
    if (Math.abs(seconds) >= amount) return formatter.format(Math.round(seconds / amount), unit);
  }
  return 'Just now';
}

function useActivityLimit() {
  const [limit, setLimit] = useState(4);
  useEffect(() => {
    const update = () => {
      if (window.innerWidth <= 900) setLimit(6);
      else if (window.innerHeight < 680) setLimit(3);
      else if (window.innerHeight < 800) setLimit(4);
      else setLimit(5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return limit;
}

export function RecentActivity({
  messages,
  broadcasts,
  earnings,
  loading,
  hasError,
  retry,
}: {
  messages: RecentMessageItem[];
  broadcasts: BroadcastItem[];
  earnings: EarningTransaction[];
  loading: boolean;
  hasError: boolean;
  retry: () => void;
}) {
  const limit = useActivityLimit();
  const activities = useMemo<ActivityItem[]>(() => {
    const messageItems = messages.map((message): ActivityItem => ({
      id: `message-${message.conversationId}`,
      kind: 'Message',
      icon: MessageCircleMore,
      iconClass: 'bg-info-bg text-brand',
      title: `@${message.username}`,
      detail: `${message.isOwn ? 'You: ' : ''}${message.content}`,
      occurredAt: message.occurredAt,
      href: `/dashboard/messenger?conversation=${encodeURIComponent(message.conversationId)}`,
      unread: message.unreadCount > 0,
    }));
    const broadcastItems = broadcasts.map((broadcast): ActivityItem => ({
      id: `broadcast-${broadcast.id}`,
      kind: 'Broadcast',
      icon: Radio,
      iconClass: 'bg-[#f0edff] text-[#6555bd]',
      title: broadcast.isOwn ? 'Your broadcast' : `@${broadcast.username}`,
      detail: broadcast.content,
      occurredAt: broadcast.publishedAt,
      href: '/dashboard/broadcasts',
    }));
    const earningItems = earnings.map((earning): ActivityItem => {
      const outgoing = earning.type === 'withdrawal';
      return {
        id: `earning-${earning.id}`,
        kind: 'Earning',
        icon: outgoing ? CircleMinus : CircleDollarSign,
        iconClass: outgoing ? 'bg-error-bg text-error' : 'bg-success-bg text-success',
        title: `${outgoing ? '' : '+'}${earning.amount} ${earning.assetCode}`,
        detail: earning.reason,
        occurredAt: earning.earnedAt,
        href: '/dashboard/earnings',
      };
    });
    return [...messageItems, ...broadcastItems, ...earningItems]
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  }, [broadcasts, earnings, messages]);
  const visible = activities.slice(0, limit);

  return (
    <article className="overview-activity-card flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold">Recent activity</h2>
          <p className="overview-card-description mt-1 text-xs text-secondary">Messages, broadcasts, and earnings in one place.</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-brand">
          <Link className="rounded-lg px-2 py-2 hover:bg-info-bg" href="/dashboard/messenger">Messages</Link>
          <Link className="rounded-lg px-2 py-2 hover:bg-info-bg" href="/dashboard/earnings">Earnings</Link>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-0 flex-1 place-items-center text-secondary" role="status">
          <LoaderCircle className="animate-spin" size={24} aria-hidden />
          <span className="sr-only">Loading recent activity</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="grid min-h-0 flex-1 place-items-center text-center">
          <div>
            <strong className="block text-sm">Your activity will appear here</strong>
            <p className="mt-1 text-xs text-muted">Discover people or share your profile to get started.</p>
            <Link className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-brand hover:bg-info-bg" href="/dashboard/discover">
              Discover people
            </Link>
          </div>
        </div>
      ) : (
        <ul className="overview-activity-list mt-2 min-h-0 divide-y divide-border">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  className="overview-activity-row grid min-h-13 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-subtle focus-visible:outline-offset-1"
                  href={item.href}
                  aria-label={`${item.kind}: ${item.title}. ${item.detail}`}
                >
                  <span className={`grid size-9 place-items-center rounded-xl ${item.iconClass}`} aria-hidden>
                    <Icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{item.kind}</span>
                      {item.unread && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold leading-4 text-white">Unread</span>}
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-baseline gap-2 text-xs">
                      <strong className="shrink-0">{item.title}</strong>
                      <span className={`truncate ${item.unread ? 'font-medium text-navy' : 'text-secondary'}`}>{item.detail}</span>
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] text-muted" dateTime={item.occurredAt}>{relativeTime(item.occurredAt)}</time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasError && (
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-2 text-xs text-warning" role="status">
          <span>Some activity could not be updated.</span>
          <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-semibold hover:bg-warning-bg" onClick={retry} type="button">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
    </article>
  );
}
