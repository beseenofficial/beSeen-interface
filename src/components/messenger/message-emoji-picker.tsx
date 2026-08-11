'use client';

import { Smile } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

const EMOJIS = ['🙂', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍'];

export function MessageEmojiPicker({ workspace }: { workspace: MessengerWorkspaceState }) {
  const { hasPendingRetry, showEmojiPicker, insertEmoji, setShowEmojiPicker } = workspace;
  return (
    <div className="relative col-start-1 row-start-1">
      <button
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-xl border transition max-sm:size-10',
          showEmojiPicker ? 'border-brand bg-info-bg text-brand' : 'border-border bg-white text-secondary hover:border-brand/40 hover:text-brand',
        )}
        disabled={hasPendingRetry}
        onClick={() => setShowEmojiPicker((current) => !current)}
        aria-label="Choose emoji"
        aria-expanded={showEmojiPicker}
        type="button"
      >
        <Smile size={20} />
      </button>
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            className="absolute bottom-full left-0 z-20 mb-2 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-white p-2 shadow-elevated"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            role="menu"
            aria-label="Emoji picker"
          >
            {EMOJIS.map((emoji) => (
              <button className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg transition hover:bg-subtle" key={emoji} onClick={() => insertEmoji(emoji)} role="menuitem" type="button">{emoji}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
