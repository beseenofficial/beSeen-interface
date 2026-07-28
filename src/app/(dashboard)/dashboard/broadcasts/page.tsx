"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BroadcastComposer } from "@/components/features/broadcasts/broadcast-composer";
import { BroadcastItem } from "@/components/features/broadcasts/broadcast-item";
import { PageHeader } from "@/components/layout/page-header";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  cancelBroadcast,
  getDecryptedFeed,
  listBroadcastDrafts,
  publishBroadcast,
  resumeBroadcast,
} from "@/lib/broadcasts";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";
import type {
  BroadcastDraftListItem,
  DecryptedBroadcast,
} from "@/types";

export default function BroadcastsPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [view, setView] = useState<"sent" | "received">("sent");
  const [broadcasts, setBroadcasts] = useState<DecryptedBroadcast[] | null>(
    null,
  );
  const [drafts, setDrafts] = useState<BroadcastDraftListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draftAction, setDraftAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const [feed, pending] = await Promise.all([
        getDecryptedFeed(view, profile),
        profile.accountType === "creator"
          ? listBroadcastDrafts()
          : Promise.resolve([]),
      ]);
      setBroadcasts(feed.items);
      setNextCursor(feed.nextCursor);
      setHasMore(feed.hasMore);
      setDrafts(pending);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not load encrypted broadcasts.",
      );
    }
  }, [profile, view]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    if (!profile || !nextCursor) return;
    setLoadingMore(true);
    try {
      const feed = await getDecryptedFeed(
        view,
        profile,
        nextCursor,
      );
      setBroadcasts((current) => [...(current ?? []), ...feed.items]);
      setNextCursor(feed.nextCursor);
      setHasMore(feed.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!profile || !broadcasts) {
    return <LoadingState label="Decrypting broadcasts…" />;
  }

  return (
    <div className="mx-auto w-full max-w-260 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="End-to-end encrypted"
        title="Broadcasts"
        description="Every message is verified before it is decrypted or displayed."
      />

      {profile.accountType === "creator" ? (
        <BroadcastComposer
          publish={async (content) => {
            const created = await publishBroadcast(content, profile);
            setView("sent");
            await load();
            toast(
              "Broadcast published",
              `Encrypted broadcast ${created.id.slice(-6)} is live.`,
            );
          }}
        />
      ) : (
        <section className="mb-5 rounded-2xl border border-[#d9d1ff] bg-[#faf9ff] p-5 text-sm text-secondary">
          Regular accounts can receive and decrypt broadcasts. Switch to a
          creator account from your profile to publish.
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mb-5 rounded-2xl border border-warning/20 bg-warning-bg p-5">
          <div className="mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.09em] text-warning">
              Interrupted uploads
            </span>
            <h2 className="mt-1 text-xl">Pending encrypted drafts</h2>
          </div>
          <div className="grid gap-3">
            {drafts.map((draft) => (
              <div
                className="flex items-center justify-between gap-4 rounded-xl border border-white/80 bg-white/75 p-3 max-sm:flex-col max-sm:items-stretch"
                key={draft.id}
              >
                <div>
                  <strong className="text-sm">
                    {draft.progress.uploadedCount}/{draft.audience.count} keys
                    uploaded
                  </strong>
                  <p className="mt-1 text-[11px] text-muted">
                    Expires {new Date(draft.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 max-sm:[&_button]:flex-1">
                  <Button
                    variant="secondary"
                    loading={draftAction === `resume:${draft.id}`}
                    icon={<RotateCcw size={16} />}
                    onClick={async () => {
                      setDraftAction(`resume:${draft.id}`);
                      try {
                        await resumeBroadcast(draft, profile);
                        toast(
                          "Draft published",
                          "The exact stored ciphertext was resumed safely.",
                        );
                        await load();
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "The draft could not be resumed.",
                        );
                      } finally {
                        setDraftAction(null);
                      }
                    }}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="tertiary"
                    icon={<Trash2 size={16} />}
                    onClick={async () => {
                      setDraftAction(`cancel:${draft.id}`);
                      try {
                        await cancelBroadcast(draft);
                        setDrafts((current) =>
                          current.filter((item) => item.id !== draft.id),
                        );
                      } finally {
                        setDraftAction(null);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <AuraRipple
          className="absolute -right-38.75 -top-38.75"
          tone="lilac"
        />
        <div className="relative z-1 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">
              Verified content
            </span>
            <h2 className="text-[23px] font-semibold">
              {view === "sent" ? "Sent by me" : "Received by me"}
            </h2>
          </div>
          <div className="flex rounded-xl bg-subtle p-1">
            {(["sent", "received"] as const).map((item) => (
              <button
                className={`min-h-9 rounded-lg px-4 text-xs font-semibold transition ${
                  view === item
                    ? "bg-white text-brand shadow-sm"
                    : "text-muted"
                }`}
                key={item}
                onClick={() => {
                  setBroadcasts(null);
                  setView(item);
                }}
              >
                {item === "sent" ? "Sent" : "Received"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative z-1 max-h-150 overflow-y-auto pr-2 [scrollbar-color:#bfccd1_transparent] [scrollbar-width:thin] max-sm:max-h-none max-sm:overflow-visible">
          {broadcasts.length ? (
            broadcasts.map((broadcast) => (
              <BroadcastItem key={broadcast.id} broadcast={broadcast} />
            ))
          ) : (
            <EmptyState
              title={`No ${view} broadcasts`}
              message={
                view === "sent"
                  ? "Your first encrypted broadcast will appear here."
                  : "Encrypted updates sent to you will appear here."
              }
            />
          )}
        </div>
        {hasMore && nextCursor && (
          <div className="relative z-1 mt-4 flex justify-center border-t border-border pt-4">
            <Button
              variant="secondary"
              loading={loadingMore}
              onClick={() => void loadMore()}
            >
              Load more
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
