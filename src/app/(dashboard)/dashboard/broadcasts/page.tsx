"use client";

import { useEffect, useState } from "react";
import { BroadcastComposer } from "@/components/features/broadcasts/broadcast-composer";
import { BroadcastItem } from "@/components/features/broadcasts/broadcast-item";
import { PageHeader } from "@/components/layout/page-header";
import { AuraRipple } from "@/components/ui/aura-ripple";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { mockApi } from "@/lib/mock-api";
import { useProfile } from "@/providers/profile-provider";
import { useToast } from "@/providers/toast-provider";
import type { Broadcast } from "@/types";

export default function BroadcastsPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<Broadcast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setBroadcasts(await mockApi.listBroadcasts());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not load your broadcasts.");
    }
  }
  useEffect(() => void load(), []);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!profile || !broadcasts) return <LoadingState label="Loading broadcasts…" />;

  return (
    <div className="mx-auto w-full max-w-260 px-12 pb-16 pt-12 max-[1180px]:px-8 max-[1180px]:pb-14 max-[1180px]:pt-10 max-sm:px-4 max-sm:pb-12 max-sm:pt-7.5">
      <PageHeader
        eyebrow="Creator updates"
        title="Broadcasts"
        description="Send an update directly to everyone who holds your Aura."
      />
      <BroadcastComposer
        publish={async (content) => {
          const created = await mockApi.createBroadcast(content);
          setBroadcasts((items) => [created, ...(items || [])]);
          toast("Broadcast published", `Sent to ${created.recipientCount} Aura holders.`);
        }}
      />
      <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-7 max-sm:p-5">
        <AuraRipple className="absolute -right-38.75 -top-38.75" tone="lilac" />
        <div className="relative z-1 mb-5 flex items-center justify-between gap-4">
          <div><span className="mb-1.25 inline-block text-xs font-bold uppercase tracking-[0.09em] text-brand">Published updates</span><h2 className="text-[23px] font-semibold">My broadcasts</h2></div>
          <span className="rounded-full bg-subtle px-2.25 py-1.25 text-[11px] font-semibold text-muted">{broadcasts.length} total</span>
        </div>
        <div className="relative z-1 max-h-127.5 overflow-y-auto pr-2 [scrollbar-color:#bfccd1_transparent] [scrollbar-width:thin] max-sm:max-h-none max-sm:overflow-visible">
          {broadcasts.length ? (
            broadcasts.map((broadcast) => (
              <BroadcastItem
                key={broadcast.id}
                broadcast={broadcast}
                username={profile.username || "creator"}
                avatarUrl={profile.avatarUrl}
              />
            ))
          ) : (
            <EmptyState title="No broadcasts yet" message="Your first update will appear here after you publish it." />
          )}
        </div>
      </section>
    </div>
  );
}
