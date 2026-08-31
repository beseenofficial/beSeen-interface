"use client";

import { AlertCircle, ArrowRight, BadgeCheck, CircleDollarSign, Radio, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { profileApi, usersApi } from "@/lib/api";
import { formatUsdc } from '@/lib/decimal';
import type { DiscoverUser, PublicUserProfile } from "@/types";

const DISCOVER_PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;
const discoverProfileCache = new Map<string, PublicUserProfile>();

function appendUniqueUsers(current: DiscoverUser[], incoming: DiscoverUser[]): DiscoverUser[] {
  const usersById = new Map(current.map((user) => [user.id, user]));
  incoming.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
}

function DiscoverSkeleton() {
  return (
    <div
      className="min-h-[320px] animate-pulse rounded-2xl bg-white p-5"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <span className="size-16 rounded-full bg-disabled" />
        <span className="h-4 w-28 rounded bg-disabled" />
      </div>
      <span className="mt-5 block h-3 w-full rounded bg-disabled/70" />
      <span className="mt-2 block h-3 w-4/5 rounded bg-disabled/70" />
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <span className="h-10 rounded bg-disabled/70" />
        <span className="h-10 rounded bg-disabled/70" />
      </div>
      <span className="mt-5 block h-11 rounded-xl bg-disabled" />
    </div>
  );
}

function DiscoverCard({ user }: { user: DiscoverUser }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const cachedProfile = discoverProfileCache.get(user.username) ?? null;
  const [profile, setProfile] = useState<PublicUserProfile | null>(cachedProfile);
  const [detailsLoading, setDetailsLoading] = useState(!cachedProfile);

  useEffect(() => {
    const cached = discoverProfileCache.get(user.username);
    if (cached) return;
    const card = cardRef.current;
    if (!card) return;
    const controller = new AbortController();
    let requested = false;
    const loadProfile = () => {
      if (requested) return;
      requested = true;
      void profileApi.public(user.username, controller.signal)
        .then((result) => {
          discoverProfileCache.set(user.username, result);
          setProfile(result);
        })
        .catch(() => undefined)
        .finally(() => setDetailsLoading(false));
    };
    if (!('IntersectionObserver' in window)) {
      loadProfile();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        loadProfile();
      },
      { rootMargin: '240px' },
    );
    observer.observe(card);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [user.username]);

  return (
    <Link
      ref={cardRef}
      className="group flex min-h-[320px] min-w-0 flex-col rounded-2xl bg-white p-5"
      href={`/u/${encodeURIComponent(user.username)}`}
      aria-label={`View @${user.username}'s profile`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <Avatar className="size-16 shrink-0 text-xl ring-4 ring-ice" username={user.username} src={user.avatar} size="lg" />
        <div className="min-w-0">
          <strong className="flex max-w-full items-center gap-1 text-[17px] font-semibold transition-colors group-hover:text-brand">
            <span className="truncate">@{user.username}</span><VerificationBadge verification={user.verification} size={17} />
          </strong>
          <span className="mt-1 block text-xs text-secondary">BeSeen creator</span>
        </div>
      </div>

      <p className="mt-5 min-h-10 line-clamp-2 text-sm leading-5 text-secondary">
        {profile?.bio?.trim() || (detailsLoading ? 'Loading profile details…' : 'Open their profile to learn more about them.')}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] text-muted"><Radio size={13} aria-hidden="true" /> Broadcasts</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">{detailsLoading ? '—' : (profile?.broadcastCount.toLocaleString() ?? '—')}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[11px] text-muted"><CircleDollarSign size={13} aria-hidden="true" /> Earned</dt>
          <dd className="mt-1 truncate text-sm font-semibold tabular-nums">{detailsLoading || profile?.totalBountyReceivedUsdc === undefined ? '—' : formatUsdc(profile.totalBountyReceivedUsdc)}</dd>
        </div>
      </dl>

      <span className="mt-auto flex min-h-11 w-full items-center justify-between rounded-xl bg-info-bg px-4 text-sm font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        View profile <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

export function DiscoverUsers() {
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified'>('all');
  const initialRequest = useRef<AbortController | null>(null);
  const paginationRequest = useRef<AbortController | null>(null);
  const paginationPending = useRef(false);
  const paginationSentinel = useRef<HTMLDivElement>(null);

  const loadInitialUsers = useCallback(async () => {
    initialRequest.current?.abort();
    const controller = new AbortController();
    initialRequest.current = controller;
    setInitialLoading(true);
    setInitialError(false);

    try {
      const result = await usersApi.discover({ limit: DISCOVER_PAGE_SIZE }, controller.signal);
      if (controller.signal.aborted) return;
      setUsers(appendUniqueUsers([], result.users));
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setPaginationError(false);
    } catch {
      if (controller.signal.aborted) return;
      setInitialError(true);
    } finally {
      if (!controller.signal.aborted) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialUsers();
    return () => {
      initialRequest.current?.abort();
      paginationRequest.current?.abort();
    };
  }, [loadInitialUsers]);

  const loadMoreUsers = useCallback(async () => {
    if (!hasMore || !nextCursor || paginationPending.current) return;

    paginationPending.current = true;
    const controller = new AbortController();
    paginationRequest.current = controller;
    setPaginationLoading(true);
    setPaginationError(false);

    try {
      const result = await usersApi.discover(
        { limit: DISCOVER_PAGE_SIZE, cursor: nextCursor },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setUsers((current) => appendUniqueUsers(current, result.users));
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      if (!controller.signal.aborted) setPaginationError(true);
    } finally {
      if (!controller.signal.aborted) setPaginationLoading(false);
      paginationPending.current = false;
    }
  }, [hasMore, nextCursor]);

  useEffect(() => {
    const sentinel = paginationSentinel.current;
    if (!sentinel || !hasMore || paginationError || initialLoading) return;
    if (!('IntersectionObserver' in window)) {
      void loadMoreUsers();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMoreUsers();
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, initialLoading, loadMoreUsers, paginationError]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleUsers = users.filter((user) => {
    if (filter === 'verified' && !user.verification?.isVerified) return false;
    return !normalizedSearch || user.username.toLocaleLowerCase().includes(normalizedSearch);
  });

  return (
    <>
      <header className="relative mb-5 overflow-hidden rounded-2xl bg-navy px-6 py-7 text-white shadow-[0_14px_36px_rgba(11,11,63,0.11)] max-sm:px-5 max-sm:py-6">
        <div className="relative z-10 flex items-center justify-between gap-8 max-sm:items-start">
          <div className="max-w-2xl">
            <h1 className="max-w-xl text-[clamp(32px,4.2vw,54px)] font-semibold leading-[0.98] tracking-[-0.04em]">
              Discover people worth reaching
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/75">
              Explore what people create, the conversations they inspire, and the rewards they have earned.
            </p>
          </div>
          <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-lime text-navy shadow-[0_10px_24px_rgba(0,0,0,0.12)] max-sm:size-16 max-sm:rounded-xl">
            <UsersRound size={42} strokeWidth={1.8} aria-hidden="true" className="max-sm:size-8" />
          </div>
        </div>
      </header>

      {!initialLoading && !initialError && users.length > 0 && (
        <div className="mb-5 flex min-w-0 items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_6px_18px_rgba(11,11,63,0.045)] max-sm:flex-col max-sm:items-stretch">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-subtle px-3.5 text-secondary transition focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/20">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search people</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-navy outline-none placeholder:text-muted"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by username"
              type="search"
              value={search}
            />
          </label>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-subtle p-1" aria-label="Discover filters">
            <button
              className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition ${filter === 'all' ? 'bg-white text-brand shadow-[0_2px_7px_rgba(11,11,63,0.06)]' : 'text-secondary hover:text-navy'}`}
              onClick={() => setFilter('all')}
              type="button"
              aria-pressed={filter === 'all'}
            >
              All
            </button>
            <button
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${filter === 'verified' ? 'bg-white text-brand shadow-[0_2px_7px_rgba(11,11,63,0.06)]' : 'text-secondary hover:text-navy'}`}
              onClick={() => setFilter('verified')}
              type="button"
              aria-pressed={filter === 'verified'}
            >
              <BadgeCheck size={15} aria-hidden="true" /> Verified
            </button>
          </div>
          <span className="shrink-0 px-2 text-xs font-semibold tabular-nums text-secondary" aria-live="polite">
            {visibleUsers.length} shown
          </span>
        </div>
      )}

      {initialLoading ? (
        <div
          className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          aria-label="Loading people"
          role="status"
        >
          {Array.from({ length: INITIAL_SKELETON_COUNT }, (_, index) => (
            <DiscoverSkeleton key={index} />
          ))}
        </div>
      ) : initialError ? (
        <section
          className="flex min-h-65 flex-col items-center justify-center rounded-2xl bg-white p-8 text-center"
          role="alert"
        >
          <span className="grid size-12 place-items-center rounded-full bg-error-bg text-error">
            <AlertCircle size={23} aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-semibold">Couldn&apos;t load people</h2>
          <p className="mt-2 text-sm text-secondary">Something went wrong while loading Discover.</p>
          <Button className="mt-5" onClick={() => void loadInitialUsers()}>Try again</Button>
        </section>
      ) : users.length === 0 ? (
        <section className="rounded-2xl bg-white p-8">
          <EmptyState
            title="No people to discover yet"
            message="New BeSeen profiles will appear here as they become available."
          />
        </section>
      ) : visibleUsers.length === 0 ? (
        <section className="grid min-h-64 place-items-center rounded-2xl bg-white p-8 text-center">
          <div>
            <Search className="mx-auto text-brand" size={28} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">No matching people</h2>
            <p className="mt-2 text-sm text-secondary">Try another username or show all profiles.</p>
            <button
              className="mt-5 min-h-11 rounded-xl bg-info-bg px-4 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              type="button"
            >
              Clear search and filters
            </button>
          </div>
        </section>
      ) : (
        <>
          <section
            className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            aria-label="People on BeSeen"
          >
            {visibleUsers.map((user) => <DiscoverCard key={user.id} user={user} />)}
          </section>

          {(hasMore || paginationError || paginationLoading) && (
            <div ref={paginationSentinel} className="mt-7 flex min-h-14 flex-col items-center justify-center gap-2 text-center">
              {paginationError && (
                <p className="text-sm text-error" role="alert">Couldn&apos;t load more people. Try again.</p>
              )}
              {paginationLoading ? (
                <span className="text-sm text-secondary" role="status">Loading more people…</span>
              ) : paginationError ? (
                <Button onClick={() => void loadMoreUsers()} variant="secondary">Try again</Button>
              ) : (
                <span className="sr-only">More people load automatically as you scroll.</span>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
