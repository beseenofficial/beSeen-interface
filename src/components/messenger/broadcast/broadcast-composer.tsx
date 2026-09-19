'use client';

import { ArrowUp, LoaderCircle, Send, Smile } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { FloatingPopover } from '@/components/messenger/floating-popover';
import type { BroadcastChatState } from '@/components/messenger/broadcast/use-broadcast-chat';
import { MAX_BROADCAST_BYTES } from '@/lib/broadcast-crypto';
import { cn } from '@/lib/utils';

const EMOJIS = ['🙂', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍'];

function BroadcastEmojiPicker({ state }: { state: BroadcastChatState }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const insertEmoji = (emoji: string) => {
    state.setDraft((current) => `${current}${emoji}`);
    close();
    requestAnimationFrame(() => state.input.current?.focus());
  };

  return (
    <div className="relative z-10 col-start-1 row-start-1 max-sm:row-start-2">
      <button
        ref={trigger}
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-xl border transition max-sm:size-12 max-sm:rounded-full max-sm:border-0 max-sm:bg-[#EFF3F4]',
          open
            ? 'border-brand bg-info-bg text-brand max-sm:bg-[#E9EEF0]'
            : 'border-border bg-white text-secondary hover:border-brand/40 hover:text-brand max-sm:text-navy max-sm:hover:bg-[#E9EEF0]',
        )}
        onClick={() => setOpen((current) => !current)}
        aria-label="Choose emoji"
        aria-expanded={open}
        type="button"
      >
        <Smile size={20} />
      </button>
      <FloatingPopover
        anchorRef={trigger}
        className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-white p-2 shadow-elevated"
        estimatedHeight={98}
        minWidth={168}
        onClose={close}
        open={open}
        role="menu"
        ariaLabel="Emoji picker"
      >
        {EMOJIS.map((emoji) => (
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg transition hover:bg-subtle"
            key={emoji}
            onClick={() => insertEmoji(emoji)}
            role="menuitem"
            type="button"
          >
            {emoji}
          </button>
        ))}
      </FloatingPopover>
    </div>
  );
}

export function BroadcastComposer({ state }: { state: BroadcastChatState }) {
  const { draft, draftBytes, handleKeyDown, input, publish, sending, setDraft } = state;
  return (
    <footer className="relative z-20 min-w-0 max-w-full bg-white px-4 pb-4 pt-2 max-sm:border-t-0 max-sm:px-3 max-sm:pt-2 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <form
        className="group/composer mx-auto grid w-[min(100%,820px)] grid-cols-[42px_minmax(0,1fr)_46px] items-end gap-2 rounded-[22px] border border-white/80 bg-white/92 p-2 shadow-[0_14px_38px_rgba(11,11,63,0.14)] backdrop-blur-xl transition max-sm:w-full max-sm:grid-cols-[56px_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-1.5 max-sm:rounded-2xl max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none max-sm:backdrop-blur-none"
        onSubmit={publish}
      >
        <span
          className="pointer-events-none hidden max-sm:col-start-2 max-sm:row-start-2 max-sm:block max-sm:min-h-12 max-sm:self-stretch max-sm:rounded-[26px] max-sm:bg-[#EFF3F4] max-sm:transition-colors max-sm:group-focus-within/composer:bg-[#E9EEF0]"
          aria-hidden="true"
        />
        <BroadcastEmojiPicker state={state} />
        <label className="relative z-10 col-start-2 row-start-1 block min-w-0 max-sm:col-start-2 max-sm:row-start-2 max-sm:pr-12">
          <span className="sr-only">Write a broadcast</span>
          <textarea
            ref={input}
            className="font-message block min-h-11 max-h-32 w-full resize-none overflow-x-hidden overflow-y-auto rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 max-sm:min-h-12 max-sm:rounded-full max-sm:px-4 max-sm:py-3 max-sm:text-[16px] max-sm:leading-6"
            maxLength={MAX_BROADCAST_BYTES}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write an update…"
            rows={1}
            wrap="soft"
            value={draft}
          />
          {draftBytes > MAX_BROADCAST_BYTES && (
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[9px] text-error">
              Message is too long
            </span>
          )}
        </label>
        <motion.button
          className="relative z-30 col-start-3 row-start-1 inline-grid min-h-11 cursor-pointer touch-manipulation place-items-center rounded-xl border-0 bg-brand px-0 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,69,245,0.24)] transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45 max-sm:col-start-2 max-sm:row-start-2 max-sm:mr-1 max-sm:size-10 max-sm:min-h-0 max-sm:justify-self-end max-sm:rounded-full max-sm:shadow-none"
          whileTap={{ scale: 0.97 }}
          disabled={sending || !draft.trim() || draftBytes > MAX_BROADCAST_BYTES}
          aria-label="Send broadcast"
          type="submit"
        >
          {sending ? (
            <LoaderCircle className="animate-spin" size={19} />
          ) : (
            <>
              <Send className="block max-sm:hidden" size={19} />
              <ArrowUp className="hidden max-sm:block" size={21} strokeWidth={2.2} />
            </>
          )}
          <span className="sr-only">Send</span>
        </motion.button>
      </form>
    </footer>
  );
}
