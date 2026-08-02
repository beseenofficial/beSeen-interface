'use client';

import { BadgeCheck, CalendarDays, ExternalLink, MessageCircleMore, RadioTower, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { OwnProfileEditor } from '@/components/profile/own-profile-editor';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/states';
import { tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.user;
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void tokenApi.followerCount(user.username).then((count) => {
      if (active) setFollowerCount(count);
    }).catch(() => {
      if (active) setFollowerCount(0);
    });
    return () => { active = false; };
  }, [user]);

  if (!user || !auth.keys) {
    return <LoadingState label="Preparing your profile…" />;
  }

  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));

  return (
    <div className="mx-auto w-full max-w-280 px-6 pb-12 pt-8 2xl:px-10 max-[900px]:px-5 max-sm:px-4 max-sm:pb-8 max-sm:pt-6">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Preview and edit the profile people see on BeSeen."
        action={<OwnProfileEditor onUpdated={() => undefined} />}
      />

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-elevated">
        <header className="flex min-h-15 items-center justify-between gap-4 border-b border-border px-5 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Public profile preview</h2>
            <p className="mt-0.5 text-xs text-muted">A compact preview of your username page</p>
          </div>
          <Link className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3.5 text-xs font-semibold text-brand transition hover:bg-info-bg" href={`/u/${user.username}`}>
            View full profile <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </header>

        <div className="bg-[#f6fafc] p-5 sm:p-8 lg:p-10">
          <article className="relative mx-auto grid max-w-210 overflow-hidden rounded-[24px] border border-white bg-white/92 shadow-[0_18px_50px_rgb(25_58_87/10%)] lg:grid-cols-[minmax(0,1fr)_minmax(245px,35%)]">
            <Image className="pointer-events-none absolute -top-64 left-[8%] w-125 max-w-none select-none opacity-65" src="/brand/beseen-aura-ripple-signature.svg" width={640} height={640} alt="" />

            <div className="relative z-10 flex min-w-0 flex-col justify-end px-6 py-8 sm:px-9 sm:py-10">
              <span className="w-fit rounded-full border-4 border-white bg-white shadow-[0_10px_25px_rgb(11_11_63/12%)]">
                <Avatar username={user.username} src={user.avatar} size="xl" className="size-25 text-3xl sm:size-29" />
              </span>

              <div className="mt-5 flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 break-all text-[clamp(30px,4vw,43px)] font-semibold tracking-[-0.045em]">@{user.username}</h3>
                <BadgeCheck className="shrink-0 text-brand" size={23} aria-label="Verified BeSeen profile" />
              </div>
              <p className="mt-2 text-sm font-semibold text-secondary sm:text-base">Building in public. Creating value.</p>
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-secondary">
                <Users size={17} aria-hidden="true" />
                {followerCount} follower{followerCount === 1 ? '' : 's'}
                <span className="text-muted" aria-hidden="true">·</span>
                0 following
              </p>
              <div className="mt-6 border-t border-border pt-5 text-sm leading-6 text-secondary">
                <p>Exploring ideas, building products, and sharing the journey.</p>
                <p>DM if you&apos;re building something interesting.</p>
              </div>
            </div>

            <aside className="relative z-10 grid content-end gap-4 border-t border-border/70 bg-white/55 p-6 backdrop-blur-sm lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-border bg-white/85 p-5">
                <h3 className="text-base font-semibold">Profile details</h3>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <CalendarDays className="text-secondary" size={20} aria-hidden="true" />
                  <div>
                    <span className="block text-xs text-muted">Joined</span>
                    <strong className="text-sm">{joined}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-white/85 px-3 py-5">
                <div className="grid justify-items-center gap-1.5 text-center">
                  <MessageCircleMore className="text-brand" size={20} aria-hidden="true" />
                  <strong>0</strong>
                  <span className="text-[11px] text-muted">Messages</span>
                </div>
                <div className="grid justify-items-center gap-1.5 text-center">
                  <RadioTower className="text-[#20aab8]" size={20} aria-hidden="true" />
                  <strong>0</strong>
                  <span className="text-[11px] text-muted">Broadcasts</span>
                </div>
              </div>
            </aside>
          </article>
        </div>
      </section>
    </div>
  );
}
