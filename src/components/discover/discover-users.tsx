"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { usersApi } from "@/lib/api";
import type { DiscoverUser } from "@/types";

const DISCOVER_PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;

function appendUniqueUsers(current: DiscoverUser[], incoming: DiscoverUser[]): DiscoverUser[] {
  const usersById = new Map(current.map((user) => [user.id, user]));
  incoming.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
}

function DiscoverSkeleton() {
  return (
    <div
      className="flex min-h-56 animate-pulse flex-col items-center justify-center rounded-2xl bg-white px-5 py-7"
      aria-hidden="true"
    >
      <span className="size-24 rounded-full bg-disabled" />
      <span className="mt-5 h-4 w-28 rounded bg-disabled" />
      <span className="mt-4 h-3 w-20 rounded bg-disabled/70" />
    </div>
  );
}

function DiscoverCard({ user }: { user: DiscoverUser }) {
  return (
    <Link
      className="group flex min-h-56 flex-col items-center justify-center rounded-2xl bg-white px-5 py-7 text-center transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-elevated focus-visible:-translate-y-1 focus-visible:shadow-elevated"
      href={`/u/${encodeURIComponent(user.username)}`}
    >
      <Avatar className="size-24 text-[26px] ring-4 ring-ice" username={user.username} src={user.avatar} size="xl" />
      <strong className="mt-5 max-w-full truncate text-[17px] font-semibold transition-colors group-hover:text-brand">
        @{user.username}
      </strong>
      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary transition-colors group-hover:text-brand">
        View profile <ArrowRight size={14} aria-hidden />
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
  const initialRequest = useRef<AbortController | null>(null);
  const paginationRequest = useRef<AbortController | null>(null);
  const paginationPending = useRef(false);

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

  const loadMoreUsers = async () => {
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
  };

  return (
    <>
      <PageHeader
        title="Discover people worth reaching"
        description="Find people on BeSeen and explore who you want to reach."
      />

      {initialLoading ? (
        <div
          className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
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
      ) : (
        <>
          <section
            className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            aria-label="People on BeSeen"
          >
            {users.map((user) => <DiscoverCard key={user.id} user={user} />)}
          </section>

          {(hasMore || paginationError) && (
            <div className="mt-7 flex flex-col items-center gap-2 text-center">
              {paginationError && (
                <p className="text-sm text-error" role="alert">Couldn&apos;t load more people. Try again.</p>
              )}
              <Button
                loading={paginationLoading}
                onClick={() => void loadMoreUsers()}
                variant="secondary"
              >
                {paginationError ? "Try again" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
