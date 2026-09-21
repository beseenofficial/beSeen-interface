'use client';

import { BadgeCheck, Inbox, LoaderCircle, Radio, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { messengerTimeLabel } from '@/components/messenger/messenger-view-utils';
import { cn } from '@/lib/utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function ConversationSidebar({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const {
    activeConversationId,
    broadcastOpen,
    conversations,
    filter,
    filteredConversations,
    hasMoreConversations,
    listError,
    listLoading,
    loadingMoreConversations,
    search,
    totalUnread,
    user,
    loadMoreConversations,
    refreshConversationList,
    setActiveConversationId,
    setBroadcastOpen,
    setFilter,
    setSearch,
  } = workspace;

  return (
    <aside
      className={cn(
        'flex min-h-0 min-w-0 flex-col overflow-hidden bg-subtle',
        (broadcastOpen || activeConversationId) && 'max-[720px]:hidden',
      )}
    >
      <div className="border-b border-border px-4 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Messages</h1>
          {totalUnread > 0 && (
            <span
              className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-semibold leading-none tabular-nums text-white"
              aria-label={`${totalUnread} unread messages`}
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 text-secondary transition focus-within:border-brand">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search conversations</span>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
          />
        </label>
        {/* <div
          className="mt-3 inline-flex rounded-xl border border-border bg-white p-1"
          aria-label="Conversation filters"
        >
          {(['all', 'unread'] as const).map((value) => (
            <button
              className={cn(
                'min-h-11 cursor-pointer rounded-lg px-4 text-xs font-semibold capitalize transition focus-visible:outline-2 focus-visible:outline-brand',
                filter === value
                  ? 'bg-info-bg text-brand'
                  : 'text-secondary hover:text-brand',
              )}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div> */}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <ul className="mb-1 grid gap-1">
          <li>
            <button
              className={cn(
                'grid min-h-16 w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                broadcastOpen
                  ? 'bg-info-bg shadow-[inset_0_0_0_1px_rgba(16,69,245,0.14)]'
                  : 'hover:bg-white',
              )}
              onClick={() => {
                setActiveConversationId(null);
                setBroadcastOpen(true);
              }}
              type="button"
              aria-current={broadcastOpen ? 'page' : undefined}
            >
              <span className="grid size-10 place-items-center rounded-full bg-info-bg text-brand">
                <Radio size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <strong className="flex items-center gap-1 truncate text-sm">
                  Broadcast{' '}
                  <BadgeCheck
                    className="fill-brand text-white"
                    size={15}
                    aria-label="Official"
                  />
                </strong>
                <span className="mt-1 block truncate text-xs text-muted">
                  Share with your followers
                </span>
              </span>
            </button>
          </li>
        </ul>

        {listLoading ? (
          <div
            className="grid min-h-32 place-items-center text-secondary"
            role="status"
          >
            <LoaderCircle className="animate-spin" size={24} />
            <span className="sr-only">Loading conversations…</span>
          </div>
        ) : listError && conversations.length === 0 ? (
          <div
            className="m-2 rounded-2xl border border-error/20 bg-error-bg p-4 text-sm text-error"
            role="alert"
          >
            <p>{listError}</p>
            <button
              className="mt-3 font-semibold underline"
              onClick={() => void refreshConversationList()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="grid min-h-40 place-items-center px-5 text-center text-secondary">
            <div>
              <Inbox className="mx-auto text-brand" size={24} />
              <p className="mt-3 text-sm font-semibold text-navy">
                {search || filter !== 'all'
                  ? 'No matching conversations'
                  : 'No direct messages yet'}
              </p>
              <p className="mt-1 text-xs">
                {search || filter !== 'all'
                  ? 'Try another search or show all messages.'
                  : "Get a creator's token to start chatting."}
              </p>
              {(search || filter !== 'all') && (
                <button
                  className="mt-3 min-h-11 rounded-xl px-4 text-xs font-semibold text-brand hover:bg-info-bg focus-visible:outline-2 focus-visible:outline-brand"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                  type="button"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="grid gap-1">
            {filteredConversations.map((conversation) => {
              const selected = conversation.id === activeConversationId;
              return (
                <motion.li
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key={conversation.id}
                >
                  <button
                    className={cn(
                      'grid min-h-16 w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                      selected && !broadcastOpen
                        ? 'bg-info-bg shadow-[inset_0_0_0_1px_rgba(16,69,245,0.14)]'
                        : 'hover:bg-white',
                    )}
                    onClick={() => {
                      setBroadcastOpen(false);
                      setActiveConversationId(conversation.id);
                    }}
                    aria-current={
                      selected && !broadcastOpen ? 'page' : undefined
                    }
                    type="button"
                  >
                    <Avatar
                      username={conversation.otherParticipant.username}
                      src={conversation.otherParticipant.avatar}
                      size="sm"
                      className="size-10"
                    />
                    <span className="min-w-0">
                      <strong className="block max-w-full truncate text-sm font-semibold">
                        @{conversation.otherParticipant.username}
                      </strong>
                      <span className="mt-1 block truncate text-xs text-muted">
                        {conversation.unreadCount > 0
                          ? 'New message'
                          : conversation.lastMessage?.senderId === user.id
                            ? 'You sent a message'
                            : conversation.lastMessage
                              ? 'Last message received'
                              : 'Ready to chat'}
                      </span>
                    </span>
                    <span className="grid justify-items-end gap-1 text-[11px] text-muted">
                      <time>
                        {messengerTimeLabel(
                          conversation.lastMessageAt ?? conversation.createdAt,
                        )}
                      </time>
                      {conversation.unreadCount > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-semibold leading-none tabular-nums text-white">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}

        {hasMoreConversations && (
          <Button
            className="mt-3 w-full"
            loading={loadingMoreConversations}
            onClick={() => void loadMoreConversations()}
            variant="tertiary"
          >
            Load more
          </Button>
        )}
      </div>
    </aside>
  );
}
