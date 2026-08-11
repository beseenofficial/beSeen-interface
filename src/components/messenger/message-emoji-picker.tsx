'use client';

import { useCallback, useRef } from 'react';
import { Smile } from 'lucide-react';
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
  const { hasPendingRetry, showEmojiPicker, insertEmoji, setShowEmojiPicker } =
    workspace;
  const close = useCallback(() => setShowEmojiPicker(false), [setShowEmojiPicker]);

  return (
    <div className="relative col-start-1 row-start-1">
      <button
        ref={trigger}
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-xl border transition max-sm:size-10',
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
