'use client';

import { Reply, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function MessageReplyPreview({ workspace }: { workspace: MessengerWorkspaceState }) {
  const { otherParticipant, replyTarget, setReplyTarget } = workspace;
  return (
    <AnimatePresence initial={false}>
      {replyTarget && (
        <motion.div
          className="mx-auto mb-2 flex items-center gap-3 overflow-hidden rounded-xl border-l-2 border-brand bg-white px-3 py-2 text-xs text-secondary"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Reply className="shrink-0 text-brand" size={17} />
          <span className="min-w-0 flex-1">
            <strong className="block text-brand">@{otherParticipant?.username ?? 'message'}</strong>
            <span className="mt-0.5 block truncate">{replyTarget.state === 'decrypted' ? replyTarget.plaintext : 'Message unavailable'}</span>
          </span>
          <button className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-white hover:text-navy" onClick={() => setReplyTarget(null)} aria-label="Cancel reply" type="button">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
