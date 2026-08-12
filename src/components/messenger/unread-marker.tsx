'use client';

import { motion } from 'framer-motion';

export function UnreadMarker({ count }: { count: number }) {
  return (
    <motion.div
      className="flex w-full items-center gap-3 py-1"
      initial={{ opacity: 0, scaleX: 0.94 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.28 }}
      role="separator"
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      <span className="h-px min-w-0 flex-1 bg-brand/35" />
      <span className="shrink-0 text-[11px] font-semibold text-brand">
        {count} unread {count === 1 ? 'message' : 'messages'}
      </span>
      <span className="h-px min-w-0 flex-1 bg-brand/35" />
    </motion.div>
  );
}
