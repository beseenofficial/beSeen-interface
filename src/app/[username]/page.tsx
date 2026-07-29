'use client';

import { BadgeCheck, CalendarDays, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { profileApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/lib/blux';
import type { PublicUser } from '@/types';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const auth = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followingBusy, setFollowingBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedProfile, count] = await Promise.all([
        profileApi.public(username),
        tokenApi.followerCount(username),
        tokenApi.profileToken(username),
      ]);
      setProfile(loadedProfile);
      setFollowerCount(count);
      if (auth.user && auth.user.id !== loadedProfile.id) {
        const holdings = await tokenApi.mine();
        setFollowing(holdings.some((token) => token.owner.id === loadedProfile.id));
      } else {
        setFollowing(false);
      }
    } catch (cause) {
      setProfile(null);
      setError(cause instanceof Error ? cause.message : 'This BeSeen profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [auth.user, username]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function follow() {
    if (!profile || !auth.user || followingBusy) return;
    setFollowingBusy(true);
    setError(null);
    try {
      const result = await tokenApi.purchase(profile.username);
      setFollowing(true);
      if (result.created) setFollowerCount((count) => count + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This profile could not be followed.');
    } finally {
      setFollowingBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading public profile…" />;
  if (error && !profile) {
    return (
      <main className="min-h-screen bg-ice p-6">
        <div className="mx-auto max-w-290">
          <Link href="/login" aria-label="Go to BeSeen sign in"><BrandLogo /></Link>
          <ErrorState message={error} retry={() => void loadProfile()} />
        </div>
      </main>
    );
  }
  if (!profile) return null;

  const ownProfile = auth.user?.id === profile.id;
  const joined = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(profile.createdAt),
  );

  return (
    <main className="min-h-screen bg-ice p-8 max-sm:p-4">
      <div className="mx-auto w-full max-w-290">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link href={auth.user ? '/dashboard' : '/login'} aria-label="Go to BeSeen">
            <BrandLogo />
          </Link>
          {!auth.user && (
            <Link className="inline-flex min-h-11.5 items-center justify-center rounded-xl border border-border bg-white px-5 font-semibold" href="/login">
              Join BeSeen
            </Link>
          )}
        </header>

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-white shadow-elevated">
          <div className="h-42 bg-[radial-gradient(circle_at_18%_40%,rgb(16_69_245/20%),transparent_28%),radial-gradient(circle_at_82%_10%,rgb(255_180_155/35%),transparent_25%),#eef8fb]" />
          <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-10 px-12 pb-12 max-[850px]:grid-cols-1 max-sm:px-6 max-sm:pb-8">
            <div>
              <div className="-mt-14 flex items-end gap-5">
                <span className="rounded-full border-4 border-white bg-white shadow-[0_8px_22px_rgb(11_11_63/12%)]">
                  <Avatar username={profile.username} src={profile.avatar} size="xl" />
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <h1 className="text-[clamp(34px,5vw,52px)] font-semibold">@{profile.username}</h1>
                <BadgeCheck className="text-brand" size={25} aria-label="Active BeSeen profile" />
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-secondary">
                <Users size={17} /> {followerCount} follower{followerCount === 1 ? '' : 's'}
              </p>
              {error && <p className="mt-4 text-sm text-error" role="alert">{error}</p>}
            </div>

            <aside className="mt-10 h-fit rounded-2xl border border-border bg-subtle p-6 max-[850px]:mt-0">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-brand"><Sparkles size={19} /></span>
                <div><strong className="block text-sm">BeSeen token</strong><small className="text-muted">Following controls future broadcasts</small></div>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted"><CalendarDays size={16} />Joined {joined}</p>
              {!ownProfile && auth.user && (
                <Button className="mt-5 w-full" loading={followingBusy} disabled={following} onClick={() => void follow()}>
                  {following ? 'Following' : 'Buy token · Follow'}
                </Button>
              )}
              {ownProfile && <p className="mt-5 text-xs text-muted">This is your profile.</p>}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
