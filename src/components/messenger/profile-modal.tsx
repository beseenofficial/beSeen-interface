'use client';

import { CalendarDays, ExternalLink, LoaderCircle, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Modal } from '@/components/ui/modal';
import { profileApi } from '@/lib/api';
import type { FollowCounts, PublicUser } from '@/types';

const joinedDate = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

type ProfileModalProps = {
  username: string | null;
  onClose: () => void;
};

export function ProfileModal({ username, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [error, setError] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!username) return;
    const controller = new AbortController();
    setProfile(null);
    setFollowCounts(null);
    setError(false);
    void Promise.allSettled([
      profileApi.public(username, controller.signal),
      profileApi.followCounts(username, controller.signal),
    ])
      .then(([profileResult, followerResult]) => {
        if (profileResult.status === 'rejected') throw profileResult.reason;
        setProfile(profileResult.value);
        if (followerResult.status === 'fulfilled') setFollowCounts(followerResult.value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [username]);

  return (
    <Modal
      open={Boolean(username)}
      onClose={onClose}
      initialFocusRef={closeButton}
      ariaLabelledBy={titleId}
      className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white shadow-elevated"
    >
        <div className="relative bg-info-bg px-7 pb-7 pt-8 text-center">
          <button ref={closeButton} className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-white text-secondary transition hover:border-brand hover:text-navy" aria-label="Close profile" onClick={onClose} type="button"><X size={18} /></button>
          {profile ? (
            <>
              <Avatar className="mx-auto size-24 border-4 border-white" username={profile.username} src={profile.avatar} size="xl" />
              <h2 className="mt-4 flex items-center justify-center gap-1.5 text-2xl font-semibold" id={titleId}>@{profile.username}<VerificationBadge verification={profile.verification} /></h2>
              {profile.bio?.trim() ? <p className="mt-1 break-words text-sm text-secondary">{profile.bio}</p> : null}
            </>
          ) : error ? (
            <div className="py-12"><h2 className="text-lg font-semibold" id={titleId}>Profile unavailable</h2><p className="mt-2 text-sm text-secondary">Please try again in a moment.</p></div>
          ) : (
            <div className="grid min-h-48 place-items-center" role="status"><h2 className="sr-only" id={titleId}>Loading profile</h2><LoaderCircle className="animate-spin text-brand" size={28} /><span className="sr-only">Loading profile</span></div>
          )}
        </div>

        {profile && (
          <div className="p-6">
            <div className="grid grid-cols-2 divide-x divide-border rounded-2xl bg-subtle py-4 text-center">
              <div><UsersRound className="mx-auto text-brand" size={19} /><strong className="mt-1.5 block text-lg">{followCounts?.followerCount.toLocaleString() ?? '—'}</strong><span className="text-[11px] text-muted">Followers</span></div>
              <div><CalendarDays className="mx-auto text-brand" size={19} /><strong className="mt-1.5 block text-sm">{joinedDate.format(new Date(profile.createdAt))}</strong><span className="text-[11px] text-muted">Joined</span></div>
            </div>
            <Link className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6]" href={`/u/${profile.username}`} onClick={onClose}>
              View full profile <ExternalLink size={17} />
            </Link>
          </div>
        )}
    </Modal>
  );
}
