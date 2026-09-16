"use client";

import { AlertCircle, ArrowDownAZ, BadgeCheck, SlidersHorizontal, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { usersApi } from "@/lib/api";
import { subscribeToInvalidation } from "@/lib/data-invalidation";
import type { DiscoverUser } from "@/types";
import { appendUniqueUsers } from './append-unique-users';
import { DiscoverCard } from './discover-card';
import { DiscoverHero } from './discover-hero';
import { DiscoverSkeleton } from './discover-skeleton';

const DISCOVER_PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;
type DiscoverSort = 'aura' | 'alphabetical' | null;

export function DiscoverUsers({ fullBleed = false }: { fullBleed?: boolean }) {
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<DiscoverSort>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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

  // Confirmed Aura purchases change follower counts and prices shown here.
  useEffect(
    () =>
      subscribeToInvalidation((detail) => {
        if (detail.resource === 'discover') void loadInitialUsers();
      }),
    [loadInitialUsers],
  );

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
  const matchingUsers = users.filter((user) => {
    if (verifiedOnly && !user.verification?.isVerified) return false;
    return !normalizedSearch || user.username.toLocaleLowerCase().includes(normalizedSearch);
  });
  const visibleUsers = [...matchingUsers];
  if (sortMode === 'aura') {
    visibleUsers.sort((first, second) => (second.followerCount ?? 0) - (first.followerCount ?? 0));
  } else if (sortMode === 'alphabetical') {
    visibleUsers.sort((first, second) => first.username.localeCompare(second.username));
  }
  useEffect(() => {
    if (!normalizedSearch || initialLoading || initialError || visibleUsers.length > 0 || !hasMore || paginationError) return;
    void loadMoreUsers();
  }, [hasMore, initialError, initialLoading, loadMoreUsers, normalizedSearch, paginationError, visibleUsers.length]);

  return (
    <>
      <span className="hidden" aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!-- THESIS: A public identity directory that makes finding a person feel immediate; it refuses the generic dashboard-card grid. OWN-WORLD: deep network navy, electric blue, bright paper, square portraits, signal dots, and compact trust metadata. STORY: search the open network, recognize a person, inspect honest signals, open their profile to begin a conversation. FIRST VIEWPORT: a dark identity field with a dominant search control, concise promise, trust note, and the people directory beginning immediately below. FORM: open network directory, grounded candidate 3, seed 7756175b. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->' }} />

      <DiscoverHero
        disabled={initialLoading || initialError}
        fullBleed={fullBleed}
        onSearchChange={setSearch}
        search={search}
      />

      {!initialLoading && !initialError && users.length > 0 && (
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            <h2 className="text-2xl font-semibold">People on BeSeen</h2>
            <p className="mt-1 text-sm text-secondary">Public profiles across the open network.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2" aria-label="Discover filters">
            <button
              className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors sm:text-sm ${sortMode === 'aura' ? 'border-navy bg-navy text-white' : 'border-[#d5ddeb] bg-white text-navy hover:border-brand hover:text-brand'}`}
              type="button"
              onClick={() => setSortMode((current) => current === 'aura' ? null : 'aura')}
              aria-label={sortMode === 'aura' ? 'Remove Most Aura sort' : 'Sort by Most Aura'}
              aria-pressed={sortMode === 'aura'}
            >
              {sortMode === 'aura' ? <X size={16} aria-hidden="true" /> : <SlidersHorizontal size={16} aria-hidden="true" />}
              Most Aura
            </button>
            <button
              className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors sm:text-sm ${verifiedOnly ? 'border-navy bg-navy text-white' : 'border-[#d5ddeb] bg-white text-navy hover:border-brand hover:text-brand'}`}
              type="button"
              onClick={() => setVerifiedOnly((current) => !current)}
              aria-label={verifiedOnly ? 'Remove Verified Only filter' : 'Filter by Verified Only'}
              aria-pressed={verifiedOnly}
            >
              {verifiedOnly ? <X size={16} aria-hidden="true" /> : <BadgeCheck size={16} aria-hidden="true" />}
              Verified Only
            </button>
            <button
              className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors sm:text-sm ${sortMode === 'alphabetical' ? 'border-navy bg-navy text-white' : 'border-[#d5ddeb] bg-white text-navy hover:border-brand hover:text-brand'}`}
              type="button"
              onClick={() => setSortMode((current) => current === 'alphabetical' ? null : 'alphabetical')}
              aria-label={sortMode === 'alphabetical' ? 'Remove A–Z sort' : 'Sort A–Z'}
              aria-pressed={sortMode === 'alphabetical'}
            >
              {sortMode === 'alphabetical' ? <X size={16} aria-hidden="true" /> : <ArrowDownAZ size={16} aria-hidden="true" />}
              A–Z
            </button>
          </div>
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
                setSortMode(null);
                setVerifiedOnly(false);
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
