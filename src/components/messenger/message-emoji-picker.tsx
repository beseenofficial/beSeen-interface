'use client';

import { useCallback, useRef } from 'react';
import { Gift, Smile } from 'lucide-react';
import { FloatingPopover } from '@/components/messenger/floating-popover';
import { cn } from '@/lib/utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

const EMOJIS = ['🙂', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍'];

export function MessageEmojiPicker({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const {
    hasPendingRetry,
    showBounty,
    bountyPanelOpen,
    showEmojiPicker,
    insertEmoji,
    setBountyPanelOpen,
    setShowEmojiPicker,
  } = workspace;
  const close = useCallback(
    () => setShowEmojiPicker(false),
    [setShowEmojiPicker],
  );

  return (
    <div className="relative z-10 col-start-1 row-start-1 max-sm:row-start-2">
      <button
        ref={trigger}
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-xl border transition max-sm:hidden',
          showEmojiPicker
            ? 'border-brand bg-info-bg text-brand'
            : 'border-border bg-white text-secondary hover:border-brand/40 hover:text-brand',
        )}
        disabled={hasPendingRetry}
        onClick={() => setShowEmojiPicker((current) => !current)}
        aria-label="Choose emoji"
        aria-expanded={showEmojiPicker}
        type="button"
      >
        <Smile size={20} />
      </button>
      <div className="group/bounty relative hidden max-sm:block">
        <button
          className={cn(
            'grid size-12 cursor-pointer place-items-center rounded-full border-0 bg-[#EFF3F4] text-navy transition hover:bg-[#EEF655] focus:bg-[#EEF655]',
            (showBounty || bountyPanelOpen) && 'bg-[#FFF1A8] text-warning',
          )}
          disabled={hasPendingRetry}
          onClick={() => setBountyPanelOpen((current) => !current)}
          aria-label="Add a bounty to this message"
          aria-expanded={bountyPanelOpen}
          aria-controls="bounty-settings"
          type="button"
        >
          <Gift size={20} strokeWidth={1.9} />
        </button>
        {/* <span
          className="pointer-events-none absolute bottom-[calc(100%+10px)] left-0 z-50 w-48 origin-bottom-left translate-y-1 rounded-xl bg-navy px-3 py-2 text-[11px] leading-4 text-white opacity-0 shadow-elevated transition duration-200 group-hover/bounty:translate-y-0 group-hover/bounty:opacity-100 group-focus-within/bounty:translate-y-0 group-focus-within/bounty:opacity-100"
          role="tooltip"
        >
          Add a bounty to reward a reply before the deadline.
        </span> */}
      </div>
      <FloatingPopover
        anchorRef={trigger}
        className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-white p-2 shadow-elevated"
        estimatedHeight={98}
        minWidth={168}
        onClose={close}
        open={showEmojiPicker}
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
