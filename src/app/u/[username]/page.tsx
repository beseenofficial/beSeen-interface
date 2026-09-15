'use client';

import { LayoutGrid, LogIn, RadioTower, Send, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { BrandLogo } from '@/components/ui/brand-logo';
import { OwnProfileEditor } from '@/components/profile/own-profile-editor';
import { ErrorState, SecureLoadingScreen } from '@/components/ui/states';
import {
  ActivityRegisterRow,
  InlineStat,
  SignalMark,
} from '@/components/profile/public-profile-kpis';
import { PublicProfileHeader } from '@/components/profile/public-profile-header';
import { PurchaseConfirmationModal } from '@/components/profile/purchase-confirmation-modal';
import {
  PRIMARY_ACTION,
  SECONDARY_ACTION,
  formatCount,
} from '@/lib/public-profile-actions';
import { usePublicProfilePage } from './use-public-profile-page';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const {
    auth,
    profile,
    followCounts,
    following,
    followingBusy,
    conversationId,
    copied,
    profileLoading,
    countsLoading,
    profileError,
    countsError,
    actionError,
    approvalOpen,
    bannerPrimary,
    bannerSecondary,
    loadProfile,
    loadFollowCounts,
    openApproval,
    confirmPurchase,
    setApprovalOpen,
    shareProfile,
  } = usePublicProfilePage(username);

  if (profileLoading) {
    return <SecureLoadingScreen label="Loading public profile…" />;
  }

  if (profileError && !profile) {
    return (
      <main className="min-h-svh bg-ice p-6">
        <div className="mx-auto max-w-[1480px]">
          <Link href="/login" aria-label="Go to BeSeen sign in">
            <BrandLogo />
          </Link>
          <ErrorState message={profileError} retry={() => void loadProfile()} />
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const ownProfile = auth.user?.id === profile.id;
  const bannerGradient = `linear-gradient(135deg, ${bannerPrimary}, ${bannerSecondary})`;
  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt));
  const profileUrl = `app.beseen.fi/u/${profile.username}`;
  const followingLabel = following ? 'Subscribed' : 'Subscribe to broadcasts';
  const siteCta = !auth.user
    ? { href: '/login', label: 'Join BeSeen', icon: LogIn }
    : ownProfile
      ? { href: '/dashboard', label: 'Go to dashboard', icon: LayoutGrid }
      : {
          href: `/u/${auth.user.username}`,
          label: 'My profile',
          icon: UserRound,
        };
  const messengerHref = conversationId
    ? `/dashboard/messenger?conversation=${encodeURIComponent(conversationId)}`
    : '/dashboard/messenger';

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-[#f3f7fa] px-4 py-5 text-navy sm:px-7 sm:py-6 lg:px-[clamp(32px,5vw,80px)]">
      <div className="relative mx-auto flex w-full max-w-[1000px] flex-col">
        <PublicProfileHeader
          copied={copied}
          authUser={auth.user}
          onShare={() => void shareProfile(profileUrl)}
          siteCta={siteCta}
        />

        <section className="public-profile-card relative mt-4 min-w-0 rounded-[24px] border border-[#d9e1f0] bg-white p-3 shadow-[0_14px_40px_-6px_rgba(35,58,115,0.10)] sm:p-4">
          <div
            className="public-profile-banner relative h-[clamp(128px,14vw,152px)] overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1px_rgba(11,11,63,0.05)] sm:rounded-[16px]"
            style={{ backgroundImage: bannerGradient }}
            aria-hidden="true"
          >
            {profile.avatar ? (
              <img
                className="size-full scale-125 object-cover opacity-75 blur-2xl saturate-150"
                src={profile.avatar}
                alt=""
              />
            ) : null}
            <span className="absolute inset-0 bg-white/15" />
            <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_45%,rgba(11,11,63,0.10))]" />
            <SignalMark className="absolute right-5 top-5 bg-white/90 drop-shadow-sm" />
          </div>

          <div className="relative grid min-w-0 px-2 pb-6 pt-0 sm:px-6 sm:pb-7 xl:grid-cols-[minmax(0,1fr)_248px] xl:gap-8 xl:px-11 xl:pb-7">
            <div className="public-profile-main relative z-10 min-w-0">
              <div className="public-profile-identity relative min-w-0">
                <div className="relative z-10 -mt-13 w-fit sm:-mt-15 xl:-mt-17">
                  <span className="inline-flex w-fit shrink-0 overflow-hidden rounded-full bg-white p-1.5 leading-none">
                    <Avatar
                      username={profile.username}
                      src={profile.avatar}
                      size="xxl"
                      className="public-profile-avatar size-28 text-[34px] sm:size-30 sm:text-[36px] xl:size-34 xl:text-[40px]"
                    />
                  </span>
                  {profile.verification?.isVerified ? (
                    <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-white shadow-raised max-sm:size-8">
                      <VerificationBadge
                        verification={profile.verification}
                        size={22}
                        className="max-sm:size-4.5"
                      />
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 min-w-0">
                  <h1 className="public-profile-name min-w-0 text-[clamp(40px,5vw,60px)] font-semibold leading-[0.96] tracking-[-0.035em] [overflow-wrap:anywhere]">
                    @{profile.username}
                  </h1>

                  {profile.bio?.trim() ? (
                    <p className="public-profile-tagline mt-3 max-w-[38ch] break-words text-[18px] leading-[1.5] text-secondary">
                      {profile.bio}
                    </p>
                  ) : null}

                  <p className="public-profile-followers mt-3.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] font-medium leading-6 text-secondary">
                    <InlineStat
                      label="Followers"
                      value={followCounts?.followerCount}
                      loading={countsLoading}
                    />
                    <span aria-hidden="true" className="text-[#a3b1c6]">
                      ·
                    </span>
                    <InlineStat
                      label="Following"
                      value={followCounts?.followingCount}
                      loading={countsLoading}
                    />
                  </p>

                  {countsError && (
                    <p
                      className="mt-3 flex flex-wrap items-center gap-2 text-sm text-error"
                      role="alert"
                    >
                      {countsError}
                      <button
                        className="font-semibold underline underline-offset-3"
                        onClick={() => void loadFollowCounts()}
                        type="button"
                      >
                        Retry
                      </button>
                    </p>
                  )}

                  {actionError && (
                    <p className="mt-4 text-sm text-error" role="alert">
                      {actionError}
                    </p>
                  )}

                  <div className="public-profile-actions mt-5 flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-1">
                    {!auth.user ? (
                      <Link className={PRIMARY_ACTION} href="/login">
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Sign in to message
                      </Link>
                    ) : ownProfile ? (
                      <Link
                        className={PRIMARY_ACTION}
                        href="/dashboard/messenger"
                      >
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Send message
                      </Link>
                    ) : following ? (
                      <Link className={PRIMARY_ACTION} href={messengerHref}>
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />{' '}
                        Open conversation
                      </Link>
                    ) : (
                      <button
                        className={`${PRIMARY_ACTION} cursor-pointer disabled:cursor-wait disabled:opacity-65`}
                        disabled={followingBusy}
                        onClick={openApproval}
                        type="button"
                      >
                        <Send
                          className="text-aqua transition-colors group-hover:text-white"
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                        />
                        {followingBusy
                          ? 'Buying Aura…'
                          : 'Purchase Aura to message'}
                      </button>
                    )}

                    {!ownProfile && auth.user ? (
                      <button
                        className={`${SECONDARY_ACTION} cursor-pointer disabled:cursor-default disabled:opacity-65`}
                        disabled={following || followingBusy}
                        onClick={openApproval}
                        type="button"
                      >
                        <RadioTower
                          size={18}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {followingBusy ? 'Buying Aura…' : followingLabel}
                      </button>
                    ) : ownProfile ? (
                      <OwnProfileEditor onUpdated={() => void loadProfile()} />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <aside className="public-profile-aside relative z-10 mt-7 min-w-0 border-t border-hairline/45 px-2 pb-1 pt-6 sm:max-w-[520px] sm:px-0 xl:mt-0 xl:flex xl:max-w-none xl:flex-col xl:justify-start xl:border-t-0 xl:px-0 xl:pb-0 xl:pt-21">
              <section className="public-profile-stats min-w-0">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                    Activity
                  </h2>
                </div>

                <div className="mt-3">
                  <ActivityRegisterRow
                    label="Total messages"
                    value={formatCount(profile.messageCount)}
                    isEmpty={profile.messageCount === 0}
                  />
                  <ActivityRegisterRow
                    label="Broadcasts"
                    value={formatCount(profile.broadcastCount)}
                    isEmpty={profile.broadcastCount === 0}
                  />
                  <ActivityRegisterRow
                    label="Bounty earned"
                    value={profile.totalBountyReceivedUsdc ?? '—'}
                    unit={
                      profile.totalBountyReceivedUsdc !== undefined
                        ? 'USDC'
                        : undefined
                    }
                    isEmpty={Number(profile.totalBountyReceivedUsdc) === 0}
                  />
                  <ActivityRegisterRow label="Joined" value={joined} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>

      <PurchaseConfirmationModal
        open={approvalOpen}
        username={profile.username}
        followingBusy={followingBusy}
        onClose={() => setApprovalOpen(false)}
        onConfirm={() => void confirmPurchase()}
      />
    </main>
  );
}
