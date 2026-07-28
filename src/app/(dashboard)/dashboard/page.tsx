'use client';

import {
  CalendarDays,
  HandCoins,
  KeyRound,
  MessageCircleMore,
  Radio,
  Share2,
  ShieldCheck,
  Wallet,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { AuraRipple } from '@/components/ui/aura-ripple';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { LoadingState } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/lib/blux';
import { APP_URL } from '@/lib/constants';
import { formatDate, shortenAddress } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

const features = [
  {
    href: '/dashboard/broadcasts',
    icon: Radio,
    title: 'Broadcasts',
    description: 'End-to-end encrypted updates for your followers.',
    soon: false,
  },
  {
    href: '/dashboard/messenger',
    icon: MessageCircleMore,
    title: 'Messenger',
    description: 'Private bounty messages and replies.',
    soon: true,
  },
];

export default function OverviewPage() {
  const { user, openWalletProfile, fundWallet } = useAuth();
  const { toast } = useToast();

  if (!user) return <LoadingState label="Loading your profile…" />;

  const profileUrl = `${APP_URL}/${user.username}`;
  const identityFacts = [
    {
      icon: Wallet,
      label: 'Stellar wallet',
      value: shortenAddress(user.walletAddress),
      copy: user.walletAddress,
      hint: 'The account you sign in with through Blux.',
    },
    {
      icon: KeyRound,
      label: 'Sign-in key',
      value: shortenAddress(user.derivedPublicKey),
      copy: user.derivedPublicKey,
      hint: 'Derived from your wallet signature. The secret half never leaves this browser.',
    },
    {
      icon: CalendarDays,
      label: 'Member since',
      value: formatDate(user.createdAt),
      copy: null,
      hint: 'The day this BeSeen account was created.',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-360 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="overview"
        title={`Good to see you, @${user.username}.`}
        description="Your BeSeen identity at a glance."
      />

      <section className="relative grid min-h-95 grid-cols-[minmax(0,1fr)_300px] items-center gap-11 overflow-hidden rounded-3xl border border-[#d9d1ff] bg-[#faf9ff] p-10.5 max-[1180px]:grid-cols-[1fr_260px] max-[1180px]:p-8.5 max-[900px]:grid-cols-1 max-sm:min-h-0 max-sm:gap-7 max-sm:rounded-[20px] max-sm:px-5 max-sm:py-6.5">
        <AuraRipple
          className="absolute! -bottom-42.5 right-27.5 size-107.5 [&_i:nth-child(3)]:size-105"
          tone="lilac"
        />
        <div className="relative z-1 [&>h2]:mt-4.5 [&>h2]:text-[clamp(34px,4vw,46px)] [&>h2]:font-semibold [&>p]:mt-3 [&>p]:text-[17px] [&>p]:text-secondary max-sm:[&>h2]:text-4xl">
          <StatusBadge tone="success">
            <ShieldCheck size={14} /> Testnet session active
          </StatusBadge>
          <h2>Your BeSeen identity is ready.</h2>
          <p>
            Signed in with Blux, verified with a wallet signature, and secured
            by keys that only exist on your devices.
          </p>
          <div className="mt-6 flex max-w-162.5 items-center justify-between gap-3 rounded-[14px] border border-border bg-white py-2 pl-4 pr-2 max-sm:flex-col max-sm:items-stretch max-sm:p-3.5">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold max-sm:break-all max-sm:whitespace-normal">
              {profileUrl}
            </span>
            <CopyButton value={profileUrl} />
          </div>
          <div className="mt-4.5 flex flex-wrap gap-2.5 max-sm:w-full max-sm:[&>*]:w-full">
            <Button
              icon={<Share2 size={18} />}
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: 'My BeSeen profile',
                    url: profileUrl,
                  });
                } else {
                  await navigator.clipboard.writeText(profileUrl);
                  toast('Profile link copied', 'It is ready to share.');
                }
              }}
            >
              Share profile
            </Button>
            {/* Blux's built-in wallet screens. */}
            <Button
              variant="secondary"
              icon={<WalletCards size={18} />}
              onClick={openWalletProfile}
            >
              Wallet profile
            </Button>
            <Button
              variant="secondary"
              icon={<HandCoins size={18} />}
              onClick={fundWallet}
            >
              Fund wallet
            </Button>
          </div>
        </div>
        <div className="relative z-1 flex flex-col items-center rounded-[18px] border border-[#5949b5]/15 bg-white p-7 text-center shadow-[0_10px_24px_rgb(11_11_63/5%)]">
          <Avatar username={user.username} src={user.avatarUrl} size="xl" />
          <strong className="mt-4 block text-[26px]">@{user.username}</strong>
          <p className="mt-1.5 text-xs text-success">active · Testnet</p>
        </div>
      </section>

      <section
        className="mt-5 grid grid-cols-3 gap-4 max-[1180px]:grid-cols-1"
        aria-label="Identity details"
      >
        {identityFacts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div
              className="rounded-2xl border border-border bg-white p-6"
              key={fact.label}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-info-bg text-brand">
                  <Icon size={19} />
                </span>
                {fact.copy && <CopyButton value={fact.copy} label="Copy" />}
              </div>
              <span className="mt-4 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                {fact.label}
              </span>
              <strong className="mt-1 block break-all text-lg">
                {fact.value}
              </strong>
              <p className="mt-2 text-xs leading-5 text-secondary">{fact.hint}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-4 max-sm:grid-cols-1" aria-label="Features">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-px hover:border-[#a9c2ca]"
              href={item.href}
              key={item.href}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[#f0edff] text-[#6555bd]">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <strong className="flex items-center gap-2 text-base">
                  {item.title}
                  {item.soon && <StatusBadge tone="warning">Soon</StatusBadge>}
                </strong>
                <span className="mt-0.5 block text-xs text-muted">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
