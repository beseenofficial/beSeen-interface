"use client";

import { AlertCircle, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { profileApi, usersApi } from "@/lib/api";
import type { DiscoverUser, PublicUserProfile } from "@/types";
import { appendUniqueUsers } from './append-unique-users';
import { DiscoverCard } from './discover-card';
import { DiscoverSkeleton } from './discover-skeleton';
import { DiscoveryRail } from './discovery-rail';

const DISCOVER_PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;
const discoverProfileCache = new Map<string, PublicUserProfile>();

export function DiscoverUsers({ fullBleed = false }: { fullBleed?: boolean }) {
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Map<string, PublicUserProfile>>(() => new Map(discoverProfileCache));
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

  useEffect(() => {
    const missingUsers = users.filter((user) => !discoverProfileCache.has(user.username));
    if (missingUsers.length === 0) return;
    const controller = new AbortController();
    void Promise.allSettled(
      missingUsers.map(async (user) => {
        const profile = await profileApi.public(user.username, controller.signal);
        discoverProfileCache.set(user.username, profile);
        setProfiles((current) => new Map(current).set(user.username, profile));
      }),
    );
    return () => controller.abort();
  }, [users]);

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
    return !normalizedSearch || user.username.toLocaleLowerCase().includes(normalizedSearch);
  });
  const verified = users
    .filter((user) => user.verification?.isVerified)
    .map((user) => profiles.get(user.username))
    .filter((profile): profile is PublicUserProfile => profile !== undefined);

  useEffect(() => {
    if (!normalizedSearch || initialLoading || initialError || visibleUsers.length > 0 || !hasMore || paginationError) return;
    void loadMoreUsers();
  }, [hasMore, initialError, initialLoading, loadMoreUsers, normalizedSearch, paginationError, visibleUsers.length]);

  return (
    <>
      <span className="hidden" aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!-- THESIS: A public identity directory that makes finding a person feel immediate; it refuses the generic dashboard-card grid. OWN-WORLD: deep network navy, electric blue, bright paper, square portraits, signal dots, and compact trust metadata. STORY: search the open network, recognize a person, inspect honest signals, open their profile to begin a conversation. FIRST VIEWPORT: a dark identity field with a dominant search control, concise promise, trust note, and the people directory beginning immediately below. FORM: open network directory, grounded candidate 3, seed 7756175b. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->' }} />

      <header className={`discover-hero relative -mt-9 mb-6 min-h-[420px] overflow-hidden bg-[#071031] text-white max-sm:-mt-6 ${fullBleed ? 'left-1/2 w-[100dvw] -translate-x-1/2' : '-mx-10 max-[1100px]:-mx-5 max-sm:-mx-4'}`}>
        <img className="absolute inset-0 size-full object-cover" src="/brand/discover-blend.svg" alt="" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,16,49,0.94)_0%,rgba(7,16,49,0.82)_48%,rgba(7,16,49,0.7)_100%)]" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1480px] px-10 py-9 max-[1100px]:px-5 max-sm:px-4 max-sm:py-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-end">
          <div>
            <h1 className="max-w-3xl text-[clamp(40px,6vw,76px)] font-semibold leading-[0.92] tracking-[-0.04em]">
              Find the person.<br /><span className="text-aqua">Start the conversation.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-6 text-[#cbd3ef]">
              BeSeen is an open network of public identities. Search anyone by username, check their signals, and reach the right profile.
            </p>
          </div>
          <div className="rounded-2xl bg-[#071031]/85 p-4 ring-1 ring-white/20">
            <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="text-lime" size={18} aria-hidden="true" /> Open to everyone</span>
            <p className="mt-2 text-xs leading-5 text-[#aeb9dc]">Browse without signing in. Your next step stays clear and under your control.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-2">
          <label className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-4 text-secondary transition focus-within:bg-[#f5f7ff]">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search people</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-navy caret-brand outline-none placeholder:text-muted"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a username"
              type="search"
              value={search}
              disabled={initialLoading || initialError}
            />
          </label>
        </div>
        </div>
      </header>

      {!initialLoading && !initialError && !normalizedSearch && users.length > 0 && (
        <div className="mb-9">
          <DiscoveryRail
            title="Verified"
            description="Profiles with a verified BeSeen identity."
            people={verified}
            detail={() => 'Verified identity'}
          />
        </div>
      )}

      {!initialLoading && !initialError && users.length > 0 && (
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            <h2 className="text-2xl font-semibold">People on BeSeen</h2>
            <p className="mt-1 text-sm text-secondary">Public profiles across the open network.</p>
          </div>
          <span className="hidden text-xs font-semibold text-secondary sm:block">Select a person to view their profile</span>
        </div>
      )}

      {initialLoading ? (
        <div
          className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3"
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
      ) : visibleUsers.length === 0 && paginationLoading ? (
        <section className="grid min-h-64 place-items-center rounded-2xl bg-white p-8 text-center" role="status">
          <div>
            <Search className="mx-auto animate-pulse text-brand" size={28} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Searching the network…</h2>
            <p className="mt-2 text-sm text-secondary">Looking beyond the people already loaded.</p>
          </div>
        </section>
      ) : visibleUsers.length === 0 && paginationError ? (
        <section className="grid min-h-64 place-items-center rounded-2xl bg-white p-8 text-center" role="alert">
          <div>
            <AlertCircle className="mx-auto text-error" size={28} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Search stopped early</h2>
            <p className="mt-2 text-sm text-secondary">We couldn&apos;t check everyone on the network.</p>
            <Button className="mt-5" onClick={() => void loadMoreUsers()}>Continue search</Button>
          </div>
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
            className="discover-grid grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3"
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
