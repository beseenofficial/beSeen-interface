'use client';

import { Bell, ChevronDown, Sun } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/lib/blux';

export function DashboardActions({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();

  return (
    <div className="hidden items-center gap-3 min-[901px]:flex">
      <button
        className="relative grid size-10 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-navy transition hover:bg-white"
        type="button"
        aria-label="Notifications"
      >
        <Bell size={21} strokeWidth={1.7} />
        <i className="absolute right-2 top-1.5 size-2 rounded-full border border-white bg-brand" />
      </button>
      {!compact && (
        <button
          className="grid size-10 cursor-pointer place-items-center border-0 border-l border-border bg-transparent text-navy transition hover:bg-white"
          type="button"
          aria-label="Display settings"
        >
          <Sun size={21} strokeWidth={1.7} />
        </button>
      )}
      <div className="flex items-center gap-2">
        <Avatar
          username={user?.username ?? null}
          src={user?.avatar}
          size="sm"
        />
        {!compact && <ChevronDown size={18} className="text-secondary" />}
      </div>
    </div>
  );
}
