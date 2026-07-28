'use client';

import { BadgeCheck, CalendarDays, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { api } from '@/lib/api';
import type { PublicUser } from '@/types';

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPublicProfile(username);
      setProfile(result);
      if (!result) {
        setError('This BeSeen profile does not exist or is no longer available.');
      }
    } catch (cause) {
      setProfile(null);
      setError(
        cause instanceof Error
          ? cause.message
          : 'This BeSeen profile could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) return <LoadingState label="Loading public profile…" />;
  if (error || !profile) {
    return (
      <main className="min-h-screen bg-ice p-6">
        <div className="mx-auto max-w-290">
          <Link href="/login" aria-label="Go to BeSeen sign in">
            <BrandLogo />
          </Link>
          <ErrorState
            message={error ?? 'This profile is unavailable.'}
            retry={() => void loadProfile()}
          />
        </div>
      </main>
    );
  }

  const joined = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt));

  return (
    <main className="min-h-screen bg-ice p-8 max-sm:p-4">
      <div className="mx-auto w-full max-w-290">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link href="/login" aria-label="Go to BeSeen sign in">
            <BrandLogo />
          </Link>
          <Link
            className="inline-flex min-h-11.5 items-center justify-center rounded-xl border border-border bg-white px-5 font-semibold text-navy transition hover:-translate-y-px hover:border-[#a9c2ca] hover:bg-subtle"
            href="/login"
          >
            Join BeSeen
          </Link>
        </header>

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-white shadow-elevated">
          <div className="h-42 bg-[radial-gradient(circle_at_18%_40%,rgb(16_69_245/20%),transparent_28%),radial-gradient(circle_at_82%_10%,rgb(255_180_155/35%),transparent_25%),#eef8fb]" />
          <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-10 px-12 pb-12 max-[850px]:grid-cols-1 max-sm:px-6 max-sm:pb-8">
            <div>
              <div className="-mt-14 flex items-end gap-5 max-sm:items-center">
                <span className="rounded-full border-4 border-white bg-white shadow-[0_8px_22px_rgb(11_11_63/12%)]">
                  <Avatar
                    username={profile.username}
                    src={profile.avatarUrl}
                    size="xl"
                  />
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <h1 className="text-[clamp(34px,5vw,52px)] font-semibold">
                  @{profile.username}
                </h1>
                <BadgeCheck
                  className="text-brand"
                  size={25}
                  aria-label="Active BeSeen profile"
                />
              </div>
              <p className="mt-4 max-w-165 leading-7 text-secondary">
                This creator is on BeSeen. Join to reach them with
                outcome-based attention — a reply, guaranteed or refunded.
              </p>
            </div>

            <aside className="mt-10 h-fit rounded-2xl border border-border bg-subtle p-6 max-[850px]:mt-0">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-brand shadow-[0_5px_15px_rgb(11_11_63/6%)]">
                  <Sparkles size={19} />
                </span>
                <div>
                  <strong className="block text-sm">Stellar Testnet</strong>
                  <small className="text-muted">BeSeen public identity</small>
                </div>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted">
                <CalendarDays size={16} />
                Joined {joined}
              </p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
