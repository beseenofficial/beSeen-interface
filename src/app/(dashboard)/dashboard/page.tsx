'use client';

import { ArrowRight, Copy, Gift, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EarningsSummary } from '@/components/dashboard/earnings-summary';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import type { BroadcastItem } from '@/components/dashboard/recent-broadcasts';
import type { RecentMessageItem } from '@/components/dashboard/recent-messages';
import { DiscoverCard } from '@/components/discover/discover-card';
import { DashboardPage } from '@/components/layout/dashboard-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/ui/states';
import { earningsApi, messengerApi, profileApi, type EarningTransaction } from '@/lib/api';
import { BROADCAST_REFRESH_INTERVAL_MS, loadCompleteBroadcastFeed, mergeBroadcastFeeds } from '@/lib/broadcast-feed';
import { decryptFeedItem } from '@/lib/broadcast-crypto';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { decryptMessengerMessage } from '@/lib/messenger-crypto';
import { useToast } from '@/providers/toast-provider';
import type { DiscoverUser } from '@/types';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]] as const;
  for (const [unit, amount] of ranges) {
    if (Math.abs(seconds) >= amount) return relativeTime.format(Math.round(seconds / amount), unit);
  }
  return 'Just now';
}

export default function OverviewPage() {
  const { user, keys } = useAuth();
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [messages, setMessages] = useState<RecentMessageItem[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [profileCardUser, setProfileCardUser] = useState<DiscoverUser | null>(null);
  const [profileCardLoading, setProfileCardLoading] = useState(true);
  const [profileCardError, setProfileCardError] = useState(false);
  const [earningsTotal, setEarningsTotal] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningTransaction[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [unclaimedBountyCount, setUnclaimedBountyCount] = useState<number | null>(null);
  const [bountiesLoading, setBountiesLoading] = useState(true);
  const [activityHasError, setActivityHasError] = useState(false);
  const refreshInFlight = useRef(false);

  const loadDashboard = useCallback(async (includeStats = false) => {
    if (!user || !keys || refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (includeStats) {
      setBroadcastsLoading(true);
      setMessagesLoading(true);
      setEarningsLoading(true);
      setBountiesLoading(true);
      setProfileCardLoading(true);
      setProfileCardError(false);
    }
    try {
      const [receivedResult, sentResult, conversationsResult] = await Promise.allSettled([
        loadCompleteBroadcastFeed('received'),
        loadCompleteBroadcastFeed('sent'),
        messengerApi.listConversations({ limit: 50 }),
      ]);
      const hasBroadcastFeed = receivedResult.status === 'fulfilled' || sentResult.status === 'fulfilled';
      const broadcastFailed = receivedResult.status === 'rejected' && sentResult.status === 'rejected';
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
            occurredAt: conversation.lastMessageAt ?? conversation.createdAt,
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
        const [earningsResult, bountyCountResult, currentProfileResult, followCountsResult] = await Promise.allSettled([
          earningsApi.list({ limit: 4 }),
          messengerApi.bountySummary(),
          profileApi.me(),
          profileApi.followCounts(user.username),
        ]);
        if (earningsResult.status === 'fulfilled') {
          setEarningsTotal(earningsResult.value.totalAmount);
          setEarnings(earningsResult.value.items.slice(0, 4));
        } else {
          setEarningsTotal(null);
          setEarnings([]);
        }
        setUnclaimedBountyCount(
          bountyCountResult.status === 'fulfilled' ? bountyCountResult.value.unclaimedCount : null,
        );
        if (currentProfileResult.status === 'fulfilled' && followCountsResult.status === 'fulfilled') {
          const currentProfile = currentProfileResult.value;
          setProfileCardUser({
            id: currentProfile.id,
            username: currentProfile.username,
            avatar: currentProfile.avatar,
            bio: currentProfile.bio,
            auraPrice: currentProfile.auraPrice,
            followerCount: followCountsResult.value.followerCount,
            followingCount: followCountsResult.value.followingCount,
            verification: currentProfile.verification,
          });
          setProfileCardError(false);
        } else {
          setProfileCardUser(null);
          setProfileCardError(true);
        }
        setProfileCardLoading(false);
        setEarningsLoading(false);
        setBountiesLoading(false);
        setActivityHasError(broadcastFailed || conversationsResult.status === 'rejected' || earningsResult.status === 'rejected');
      } else {
        setActivityHasError(broadcastFailed || conversationsResult.status === 'rejected');
      }
    } catch {
      if (includeStats) {
        setBroadcasts([]);
        setMessages([]);
        setUnreadMessageCount(0);
        setEarningsTotal(null);
        setEarnings([]);
        setUnclaimedBountyCount(null);
        setProfileCardUser(null);
        setProfileCardLoading(false);
        setProfileCardError(true);
        setEarningsLoading(false);
        setBountiesLoading(false);
        setActivityHasError(true);
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
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast('Profile link copied', 'It is ready to share.');
    } catch {
      toast('Profile link not copied', 'Allow clipboard access and try again.', { variant: 'error' });
    }
  };

  return (
    <DashboardPage className="overview-page">
      <PageHeader
        title="Overview"
        description="See what needs attention and take your next best action."
        className="overview-page-header"
      />

      <section className="overview-workspace" aria-label="Dashboard overview">
        <article className="overview-bounty relative min-h-0 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_42%_36%,#ffffff_0%,#fbfcff_52%,#eef3ff_100%)] p-6">
          <Image className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-none select-none opacity-90" src="/brand/beseen-available-bounty-ripple.svg" width={520} height={280} alt="" priority />
          <div className="relative z-10 flex h-full min-h-0 flex-col justify-between">
            <div className="flex items-start gap-4">
              <span className="overview-bounty-icon grid size-12 shrink-0 place-items-center rounded-full bg-info-bg text-brand"><Gift size={23} strokeWidth={1.8} /></span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold">Available bounties</h2>
                {bountiesLoading ? (
                  <span className="mt-2 block h-12 w-24 animate-pulse rounded-xl bg-info-bg" role="status"><span className="sr-only">Loading available bounties</span></span>
                ) : (
                  <strong className="overview-bounty-value mt-1 block text-[clamp(42px,5vw,64px)] font-medium leading-none tabular-nums tracking-[-0.04em] text-brand">
                    {unclaimedBountyCount === null ? '—' : unclaimedBountyCount.toLocaleString()}
                  </strong>
                )}
              </div>
            </div>

            <div className="overview-bounty-footer max-w-[29rem]">
              <p className="overview-bounty-hint text-sm text-secondary">
                {bountiesLoading
                  ? 'Checking what needs your attention…'
                  : unclaimedBountyCount === null
                    ? 'We could not update your bounty status.'
                    : unclaimedBountyCount > 0
                      ? `${unclaimedBountyCount.toLocaleString()} ${unclaimedBountyCount === 1 ? 'bounty is' : 'bounties are'} waiting to be claimed.`
                      : unreadMessageCount > 0
                        ? `${unreadMessageCount.toLocaleString()} ${unreadMessageCount === 1 ? 'conversation needs' : 'conversations need'} your attention.`
                        : 'Share your profile to attract your next opportunity.'}
              </p>
              {unclaimedBountyCount === null && !bountiesLoading ? (
                <button className="overview-bounty-action mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" onClick={() => void loadDashboard(true)} type="button">
                  <RefreshCw size={17} /> Try again
                </button>
              ) : unclaimedBountyCount !== null && unclaimedBountyCount > 0 ? (
                <Link className="overview-bounty-action mt-3 inline-flex min-h-11 items-center gap-3 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" href="/dashboard/messenger">Review bounties <ArrowRight size={17} /></Link>
              ) : unreadMessageCount > 0 ? (
                <Link className="overview-bounty-action mt-3 inline-flex min-h-11 items-center gap-3 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" href="/dashboard/messenger">Read messages <ArrowRight size={17} /></Link>
              ) : (
                <button className="overview-bounty-action mt-3 inline-flex min-h-11 items-center gap-3 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" onClick={() => void copyProfile()} type="button">Copy profile link <Copy size={17} /></button>
              )}
            </div>
          </div>
        </article>

        <EarningsSummary
          totalAmount={earningsTotal}
          latest={earnings[0] ?? null}
          loading={earningsLoading}
          onWithdrawConfirmed={() => void loadDashboard(true)}
        />

        <RecentActivity
          messages={messages}
          broadcasts={broadcasts}
          earnings={earnings}
          loading={messagesLoading || broadcastsLoading || earningsLoading}
          hasError={activityHasError}
          retry={() => void loadDashboard(true)}
        />

        <div className="overview-discover-card min-h-0">
          {profileCardLoading ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-5" role="status" aria-label="Loading your profile card">
              <span className="h-7 w-28 animate-pulse rounded-md bg-border" />
              <span className="mt-3 min-h-24 flex-1 animate-pulse rounded-2xl bg-info-bg" />
              <span className="mt-2 h-10 animate-pulse rounded-xl bg-hairline" />
              <span className="mt-3 h-16 animate-pulse rounded-2xl bg-subtle" />
              <span className="mt-3 h-10 animate-pulse rounded-xl bg-hairline" />
            </div>
          ) : profileCardUser ? (
            <DiscoverCard user={profileCardUser} compact />
          ) : (
            <div className="flex h-full min-h-0 flex-col items-start justify-between rounded-3xl border border-border bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold">Your profile</h2>
                <p className="mt-2 text-sm text-secondary">{profileCardError ? 'Your profile stats could not be updated.' : 'Your public profile will appear here.'}</p>
              </div>
              <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-white hover:bg-[#0c3bd6]" href="/dashboard/profile">
                Edit profile <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </DashboardPage>
  );
}
