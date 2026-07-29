'use client';

import {
  CalendarDays,
  KeyRound,
  MessageCircleMore,
  Radio,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  AccountActivity,
  type ActivityStat,
} from '@/components/dashboard/account-activity';
import { IdentityCard } from '@/components/dashboard/identity-card';
import {
  IdentityFacts,
  type IdentityFact,
} from '@/components/dashboard/identity-facts';
import {
  RecentBroadcasts,
  type BroadcastItem,
} from '@/components/dashboard/recent-broadcasts';
import { RecentMessages } from '@/components/dashboard/recent-messages';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { bytesToBase64 } from '@/lib/encoding';
import { formatDate, shortenAddress } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

export default function OverviewPage() {
  const { user, keys, address, openWalletProfile, fundWallet, completeSignIn } =
    useAuth();
  const { toast } = useToast();

  if (!user) return <LoadingState label="Loading your profile…" />;

  const profileUrl = `${APP_URL}/${user.username}`;
  const publicKey = keys ? bytesToBase64(keys.signingPublicKey) : null;
  const identityFacts: IdentityFact[] = [
    {
      icon: WalletCards,
      label: 'Stellar wallet',
      value: address ? shortenAddress(address) : 'Not connected',
      copy: address,
      hint: 'The account you use across BeSeen.',
    },
    {
      icon: KeyRound,
      label: 'Sign-in key',
      value: publicKey ? shortenAddress(publicKey) : 'Locked',
      copy: publicKey,
      hint: publicKey
        ? 'Device fingerprint verified. This key is never stored on our servers.'
        : 'Reconnect the registered wallet to unlock your local key.',
    },
    {
      icon: CalendarDays,
      label: 'Member since',
      value: formatDate(user.createdAt),
      copy: null,
      hint: 'The day this BeSeen account was created.',
    },
  ];

  const shareProfile = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My BeSeen profile', url: profileUrl });
      return;
    }
    await navigator.clipboard.writeText(profileUrl);
    toast('Profile link copied', 'It is ready to share.');
  };

  const activityStats: ActivityStat[] = [
    { value: '1', label: 'Broadcasts', sublabel: 'Sent', icon: Radio },
    {
      value: '0',
      label: 'Messages',
      sublabel: 'Received',
      icon: MessageCircleMore,
    },
    { value: '0', label: 'Auras', sublabel: 'Owned', icon: Sparkles },
    {
      value: 'XLM',
      label: 'Wallet balance',
      sublabel: 'Open wallet',
      icon: WalletCards,
      onClick: openWalletProfile,
    },
  ];

  const recentBroadcasts: BroadcastItem[] = [
    {
      id: '1',
      title: 'Welcome to BeSeen',
      description: 'First broadcast to your followers.',
      timestamp: 'Jul 29, 2026 · 10:42 AM',
      iconBg: 'bg-aqua/35 text-brand',
    },
    {
      id: '2',
      title: 'No title',
      description: 'You have not added a message yet.',
      timestamp: 'Jul 29, 2026 · 09:15 AM',
      iconBg: 'bg-info-bg text-secondary',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1220px] px-6 pb-12 pt-8 2xl:max-w-[1380px] 2xl:px-10 max-[1100px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, @${user.username}.`}
        description="Here's what's happening with your BeSeen identity."
      />

      <IdentityCard
        username={user.username}
        avatar={user.avatar}
        profileUrl={profileUrl}
        hasKeys={!!keys}
        onReconnect={() => completeSignIn()}
        onShare={() => shareProfile()}
        onOpenWallet={openWalletProfile}
        onFundWallet={fundWallet}
      />

      <IdentityFacts facts={identityFacts} />

      <AccountActivity stats={activityStats} />

      <section className="mt-4 grid gap-3.5 lg:grid-cols-[1fr_1.05fr]">
        <RecentBroadcasts broadcasts={recentBroadcasts} />
        <RecentMessages hasMessages={false} />
      </section>
    </div>
  );
}
