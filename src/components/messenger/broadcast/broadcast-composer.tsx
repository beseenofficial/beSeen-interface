'use client';

import { LoaderCircle, Send } from 'lucide-react';
import type { BroadcastChatState } from '@/components/messenger/broadcast/use-broadcast-chat';
import { MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';

export function BroadcastComposer({ state }: { state: BroadcastChatState }) {
  const { draft, draftBytes, handleKeyDown, input, publish, sending, setDraft } = state;
  return (
    <footer className="min-w-0 max-w-full overflow-x-hidden border-t border-border bg-white p-4 max-sm:px-3 max-sm:py-2 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <form className="mx-auto grid min-w-0 grid-cols-[minmax(0,1fr)_52px] items-end gap-3 max-sm:grid-cols-[minmax(0,1fr)_44px] max-sm:gap-2" onSubmit={publish}>
        <label className="relative block min-w-0">
          <span className="sr-only">Write a broadcast</span>
          <textarea
            ref={input}
            className="block min-h-12 max-h-36 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted focus:border-brand max-sm:min-h-11 max-sm:py-2.5"
            maxLength={MAX_BROADCAST_BYTES}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write an update…"
            rows={1}
            value={draft}
          />
          {draftBytes > MAX_BROADCAST_BYTES && (
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[9px] text-error">Message is too long</span>
          )}
        </label>
        <button
          className="grid size-13 cursor-pointer place-items-center rounded-xl border-0 bg-brand text-white transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45 max-sm:size-11"
          disabled={sending || !draft.trim() || draftBytes > MAX_BROADCAST_BYTES}
          aria-label="Send broadcast"
          type="submit"
        >
          {sending ? <LoaderCircle className="animate-spin" size={21} /> : <Send size={21} />}
        </button>
      </form>
    </footer>
  );
}
