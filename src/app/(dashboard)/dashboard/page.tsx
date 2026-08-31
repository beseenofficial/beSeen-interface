'use client';

import { ArrowRight, CircleDollarSign, Copy, Gift, Link2, MessageCircleMore, Sparkles, Tag, UsersRound, WalletCards } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { RecentBroadcasts, type BroadcastItem } from '@/components/dashboard/recent-broadcasts';
import { RecentMessages, type RecentMessageItem } from '@/components/dashboard/recent-messages';
import { DashboardPage } from '@/components/layout/dashboard-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/ui/states';
import { messengerApi, profileApi, tokenApi } from '@/lib/api';
import { BROADCAST_REFRESH_INTERVAL_MS, loadCompleteBroadcastFeed, mergeBroadcastFeeds } from '@/lib/broadcast-feed';
import { decryptFeedItem } from '@/lib/broadcast-crypto';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { formatUsdc } from '@/lib/decimal';
import { decryptMessengerMessage } from '@/lib/messenger-crypto';
import { useToast } from '@/providers/toast-provider';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]] as const;
  for (const [unit, amount] of ranges) {
    if (Math.abs(seconds) >= amount) return relativeTime.format(Math.round(seconds / amount), unit);
  }
  return 'Just now';
}

type StatCardProps = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  iconClass: string;
  label: string;
  value: string;
  hint: string;
  onClick?: () => void;
};

function StatCard({ icon: Icon, iconClass, label, value, hint, onClick }: StatCardProps) {
  const content = <><span className={`overview-stat-icon grid size-11 place-items-center rounded-full ${iconClass}`}><Icon size={21} strokeWidth={1.8} /></span><span className="overview-stat-label mt-5 block text-sm font-semibold">{label}</span><strong className="overview-stat-value mt-1.5 block text-[27px] font-medium leading-none tracking-[-0.03em]">{value}</strong><span className="overview-stat-hint mt-2.5 block text-xs text-muted">{hint}</span></>;
  if (onClick) return <button className="overview-stat-card min-h-46 cursor-pointer rounded-2xl border border-border bg-white p-5 text-left transition hover:border-brand/25 hover:shadow-elevated" onClick={onClick} type="button">{content}</button>;
  return <article className="overview-stat-card min-h-46 rounded-2xl border border-border bg-white p-5">{content}</article>;
}

export default function OverviewPage() {
  const { user, keys, openWalletProfile } = useAuth();
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [messages, setMessages] = useState<RecentMessageItem[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [aurasOwned, setAurasOwned] = useState<number | null>(null);
  const [lifetimeBounty, setLifetimeBounty] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const loadDashboard = useCallback(async (includeStats = false) => {
    if (!user || !keys || refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (includeStats) setBroadcastsLoading(true);
    try {
      const [receivedResult, sentResult, conversationsResult] = await Promise.allSettled([
        loadCompleteBroadcastFeed('received'),
        loadCompleteBroadcastFeed('sent'),
        messengerApi.listConversations({ limit: 50 }),
      ]);
      const hasBroadcastFeed = receivedResult.status === 'fulfilled' || sentResult.status === 'fulfilled';
      if (hasBroadcastFeed) {
        const combinedFeed = mergeBroadcastFeeds(
          receivedResult.status === 'fulfilled' ? receivedResult.value : [],
          sentResult.status === 'fulfilled' ? sentResult.value : [],
        );
        const decrypted = await Promise.all(combinedFeed.slice(0, 4).map((item) => decryptFeedItem(item, keys)));
        setBroadcasts(decrypted.map((item) => ({
          id: item.id,
          username: item.creator.username,
          avatar: item.creator.avatar,
          content: item.state === 'decrypted' ? item.content || 'Broadcast' : item.state === 'locked' ? 'Encrypted broadcast' : 'Broadcast verification failed',
          timestamp: formatRelativeTime(item.publishedAt),
          publishedAt: item.publishedAt,
          isOwn: item.viewerKey.source === 'creator',
          recipientCount: item.manifest.audienceCount,
        })));
      } else if (includeStats) {
        setBroadcasts([]);
      }

      if (conversationsResult.status === 'fulfilled') {
        const conversations = conversationsResult.value.items;
        setUnreadMessageCount(conversations.reduce((total, conversation) => total + conversation.unreadCount, 0));
        const recentConversations = conversations
          .filter((conversation) => conversation.lastMessage !== null)
          .sort((left, right) => new Date(right.lastMessageAt ?? right.createdAt).getTime() - new Date(left.lastMessageAt ?? left.createdAt).getTime())
          .slice(0, 4);
        const recentMessages = await Promise.all(recentConversations.map(async (conversation): Promise<RecentMessageItem> => {
          let content = 'Encrypted message';
          try {
            const history = await messengerApi.messages(conversation.id, { limit: 1 });
            const latestItem = history.items.find((item) => item.sequence === conversation.lastMessage?.sequence) ?? history.items[0];
            if (latestItem) {
              const decrypted = await decryptMessengerMessage(latestItem, keys);
              if (decrypted.state === 'decrypted' && decrypted.plaintext) {
                content = decrypted.plaintext.replace(/\s+/g, ' ').trim();
              }
            }
          } catch {
            // Keep the conversation visible even if its preview cannot be decrypted.
          }
          return {
            conversationId: conversation.id,
            username: conversation.otherParticipant.username,
            avatar: conversation.otherParticipant.avatar,
            content,
            timestamp: formatRelativeTime(conversation.lastMessageAt ?? conversation.createdAt),
            unreadCount: conversation.unreadCount,
            isOwn: conversation.lastMessage?.senderId === user.id,
          };
        }));
        setMessages(recentMessages);
      } else if (includeStats) {
        setMessages([]);
        setUnreadMessageCount(0);
      }

      if (includeStats) {
        const [followerResult, tokensResult, profileResult] = await Promise.allSettled([
          profileApi.followCounts(user.username),
          tokenApi.mine(),
          profileApi.public(user.username),
        ]);
        setFollowerCount(followerResult.status === 'fulfilled' ? followerResult.value.followerCount : null);
        setAurasOwned(tokensResult.status === 'fulfilled' ? tokensResult.value.length : null);
        setLifetimeBounty(profileResult.status === 'fulfilled' ? profileResult.value.totalBountyReceivedUsdc : null);
      }
    } catch {
      if (includeStats) {
        setBroadcasts([]);
        setMessages([]);
        setUnreadMessageCount(0);
      }
    } finally {
      if (includeStats) {
        setBroadcastsLoading(false);
        setMessagesLoading(false);
      }
      refreshInFlight.current = false;
    }
  }, [keys, user]);

  useEffect(() => {
    void loadDashboard(true);
    const refresh = () => void loadDashboard(false);
    const interval = window.setInterval(refresh, BROADCAST_REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadDashboard]);
  if (!user || !keys) return <LoadingState label="Preparing your secure profile…" />;

  const profileUrl = `${APP_URL}/u/${user.username}`;
  const copyProfile = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast('Profile link copied', 'It is ready to share.');
  };

  return (
    <DashboardPage className="overview-page">
      <PageHeader
        title="Overview"
        description="Track your BeSeen activity, audience, and earnings at a glance."
        className="overview-page-header"
      />

      <section className="overview-primary grid gap-4 xl:grid-cols-4 xl:grid-rows-[68px_184px]" aria-label="Bounty and earnings summary">
        <article className="overview-bounty relative min-h-[268px] overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_45%_42%,#ffffff_0%,#fbfcff_54%,#f1f5ff_100%)] p-6 xl:col-span-2 xl:row-span-2 xl:min-h-0">
          <Image className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-none select-none" src="/brand/beseen-available-bounty-ripple.svg" width={520} height={280} alt="" priority />
          <div className="relative z-10 flex h-full items-start gap-5">
            <span className="overview-bounty-icon grid size-14 shrink-0 place-items-center rounded-full bg-info-bg text-brand"><Gift size={27} strokeWidth={1.8} /></span>
            <div className="overview-bounty-content pt-2">
              <h2 className="text-[17px] font-semibold">Available bounties</h2>
              <strong className="overview-bounty-value mt-2 block text-[62px] font-medium leading-[0.95] tracking-[-0.05em] text-brand">$0</strong>
              <p className="overview-bounty-hint mt-4 text-sm text-secondary">No unanswered messages</p>
              <Link className="overview-bounty-action mt-7 inline-flex min-h-12 items-center gap-7 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" href="/dashboard/messenger">Go to Messenger <ArrowRight size={19} /></Link>
            </div>
          </div>
        </article>
        <button className="flex min-h-17 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-5 text-left transition hover:border-brand/25 hover:shadow-elevated xl:col-span-2" onClick={copyProfile} type="button">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-info-bg text-brand"><Link2 size={18} strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Public profile</span>
            <strong className="mt-0.5 block truncate text-sm text-brand">beseen.fi/{user.username}</strong>
          </span>
          <Copy className="shrink-0 text-navy" size={19} />
        </button>
        <StatCard icon={MessageCircleMore} iconClass="bg-info-bg text-brand" label="Unread messages" value={unreadMessageCount.toLocaleString()} hint={unreadMessageCount > 0 ? `${unreadMessageCount} waiting to be read` : 'You are all caught up'} />
        <StatCard icon={CircleDollarSign} iconClass="bg-success-bg text-emerald-600" label="Bounty earned" value={lifetimeBounty === null ? '—' : formatUsdc(lifetimeBounty)} hint="All-time claimed USDC bounties" />
      </section>

      <section className="overview-secondary mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Aura and wallet summary">
        <StatCard icon={UsersRound} iconClass="bg-info-bg text-brand" label="Aura holders" value={followerCount === null ? '—' : followerCount.toLocaleString()} hint="People holding your Aura" />
        <StatCard icon={Sparkles} iconClass="bg-[#f0eaff] text-[#7047e8]" label="Auras owned" value={aurasOwned === null ? '—' : aurasOwned.toLocaleString()} hint="Auras you own" />
        <StatCard icon={Tag} iconClass="bg-[#fff0ea] text-[#ff6b3d]" label="Your Aura price" value="—" hint="Pricing is not available yet" />
        <StatCard icon={WalletCards} iconClass="bg-[#e5f7ff] text-[#167fa8]" label="Demo USDC balance" value={user.demoUsdcBalance === undefined ? '—' : formatUsdc(user.demoUsdcBalance)} hint="Available for message bounties" onClick={openWalletProfile} />
      </section>

      <section className="overview-recent mt-4 grid gap-4 lg:grid-cols-2">
        <RecentMessages messages={messages} loading={messagesLoading} />
        <RecentBroadcasts broadcasts={broadcasts} loading={broadcastsLoading} />
      </section>
    </DashboardPage>
  );
}
