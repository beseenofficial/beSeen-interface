'use client';

import { CalendarDays, KeyRound, MessageCircleMore, Radio, Sparkles, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AccountActivity, type ActivityStat } from '@/components/dashboard/account-activity';
import { IdentityCard } from '@/components/dashboard/identity-card';
import { IdentityFacts, type IdentityFact } from '@/components/dashboard/identity-facts';
import { RecentBroadcasts, type BroadcastItem } from '@/components/dashboard/recent-broadcasts';
import { RecentMessages } from '@/components/dashboard/recent-messages';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/ui/states';
import { loadCompleteBroadcastFeed } from '@/lib/broadcast-feed';
import { decryptFeedItem } from '@/lib/broadcast-crypto';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { bytesToBase64 } from '@/lib/encoding';
import { formatDate, shortenAddress } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

const broadcastTime = new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export default function OverviewPage() {
  const { user, keys, address, openWalletProfile, fundWallet, completeSignIn } = useAuth();
  const { toast } = useToast();
  const [sentBroadcasts, setSentBroadcasts] = useState<BroadcastItem[]>([]);
  const [sentBroadcastCount, setSentBroadcastCount] = useState<number | null>(null);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);

  const loadRecentBroadcasts = useCallback(async () => {
    if (!user) return;
    setBroadcastsLoading(true);
    try {
      const sent = await loadCompleteBroadcastFeed('sent');
      const decrypted = await Promise.all(sent.slice(0, 2).map((item) => decryptFeedItem(item, keys)));
      setSentBroadcastCount(sent.length);
      setSentBroadcasts(decrypted.map((item) => ({
        id: item.id,
        title: item.state === 'decrypted'
          ? item.content?.split('\n')[0].trim() || 'Broadcast'
          : item.state === 'locked' ? 'Encrypted broadcast' : 'Broadcast verification failed',
        description: item.state === 'decrypted'
          ? `Sent to ${item.manifest.audienceCount.toLocaleString()} follower${item.manifest.audienceCount === 1 ? '' : 's'}.`
          : item.state === 'locked' ? 'Reconnect your wallet to read this broadcast.' : 'This broadcast could not be verified.',
        timestamp: broadcastTime.format(new Date(item.publishedAt)),
        iconBg: 'bg-aqua/35 text-brand',
      })));
    } catch {
      setSentBroadcasts([]);
      setSentBroadcastCount(0);
    } finally {
      setBroadcastsLoading(false);
    }
  }, [keys, user]);

  useEffect(() => { void loadRecentBroadcasts(); }, [loadRecentBroadcasts]);

  if (!user) return <LoadingState label="Loading your profile…" />;

  const profileUrl = `${APP_URL}/${user.username}`;
  const publicKey = keys ? bytesToBase64(keys.signingPublicKey) : null;
  const identityFacts: IdentityFact[] = [
    { icon: WalletCards, label: 'Stellar wallet', value: address ? shortenAddress(address) : 'Not connected', copy: address, hint: 'The account you use across BeSeen.' },
    { icon: KeyRound, label: 'Sign-in key', value: publicKey ? shortenAddress(publicKey) : 'Locked', copy: publicKey, hint: publicKey ? 'Device fingerprint verified. This key is never stored on our servers.' : 'Reconnect the registered wallet to unlock your local key.' },
    { icon: CalendarDays, label: 'Member since', value: formatDate(user.createdAt), copy: null, hint: 'The day this BeSeen account was created.' },
  ];

  const shareProfile = async () => {
    if (navigator.share) { await navigator.share({ title: 'My BeSeen profile', url: profileUrl }); return; }
    await navigator.clipboard.writeText(profileUrl);
    toast('Profile link copied', 'It is ready to share.');
  };

  const activityStats: ActivityStat[] = [
    { value: sentBroadcastCount === null ? '—' : sentBroadcastCount.toLocaleString(), label: 'Broadcasts', sublabel: 'Sent', icon: Radio },
    { value: '0', label: 'Messages', sublabel: 'Received', icon: MessageCircleMore },
    { value: '0', label: 'Auras', sublabel: 'Owned', icon: Sparkles },
    { value: 'XLM', label: 'Wallet balance', sublabel: 'Open wallet', icon: WalletCards, onClick: openWalletProfile },
  ];

  return (
    <div className="mx-auto w-full max-w-[1220px] px-6 pb-12 pt-8 2xl:max-w-[1380px] 2xl:px-10 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      <PageHeader eyebrow="Overview" title={`Good to see you, @${user.username}.`} description="Here's what's happening with your BeSeen identity." />
      <IdentityCard username={user.username} avatar={user.avatar} profileUrl={profileUrl} hasKeys={!!keys} onReconnect={() => completeSignIn()} onShare={() => shareProfile()} onOpenWallet={openWalletProfile} onFundWallet={fundWallet} />
      <IdentityFacts facts={identityFacts} />
      <AccountActivity stats={activityStats} />
      <section className="mt-4 grid gap-3.5 lg:grid-cols-[1fr_1.05fr]">
        <RecentBroadcasts broadcasts={sentBroadcasts} loading={broadcastsLoading} />
        <RecentMessages hasMessages={false} />
      </section>
    </div>
  );
}
