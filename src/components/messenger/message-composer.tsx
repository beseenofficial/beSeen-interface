'use client';

import { LoaderCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { MessageBountyControls } from '@/components/messenger/message-bounty-controls';
import { MessageComposerStatus } from '@/components/messenger/message-composer-status';
import { MessageEmojiPicker } from '@/components/messenger/message-emoji-picker';
import { MessageReplyPreview } from '@/components/messenger/message-reply-preview';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';
import { MAX_MESSENGER_BYTES } from '@/lib/messenger-crypto';
import { cn } from '@/lib/utils';

export function MessageComposer({
  workspace,
}: {
  workspace: MessengerWorkspaceState;
}) {
  const {
    draft,
    draftBytes,
    hasPendingRetry,
    messageInput,
    sending,
    showBounty,
    handleMessageKeyDown,
    sendMessage,
    setDraft,
  } = workspace;
  return (
    <footer className="min-w-0 max-w-full overflow-x-hidden border-t border-border bg-white px-4 py-2">
      <MessageComposerStatus workspace={workspace} />
      <MessageReplyPreview workspace={workspace} />
      <form
        className="mx-auto grid w-full  grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-2xl  p-2 transition focus-within:border-brand/35 max-sm:grid-cols-[40px_minmax(0,1fr)_auto]"
        onSubmit={sendMessage}
      >
        <MessageEmojiPicker workspace={workspace} />
        <label className="relative col-start-2 row-start-1 block min-w-0 max-sm:col-span-2">
          <span className="sr-only">Write a message</span>
          <textarea
            ref={messageInput}
            className="block min-h-11 max-h-32 w-full resize-none overflow-y-auto rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={hasPendingRetry}
            maxLength={MAX_MESSENGER_BYTES}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={handleMessageKeyDown}
            placeholder="Write a message..."
            rows={1}
            value={draft}
          />
          {draftBytes > MAX_MESSENGER_BYTES && (
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[9px] text-error">
              Message is too long
            </span>
          )}
        </label>
        <MessageBountyControls workspace={workspace} />
        <motion.button
          className={cn(
            'col-start-4 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45',
            showBounty
              ? 'max-[1450px]:row-start-1 max-sm:col-span-3 max-sm:col-start-1 max-sm:row-start-3 max-sm:w-full'
              : 'max-sm:col-start-3 max-sm:row-start-2',
          )}
          whileTap={{ scale: 0.97 }}
          disabled={
            sending ||
            hasPendingRetry ||
            !draft.trim() ||
            draftBytes > MAX_MESSENGER_BYTES
          }
          aria-label="Send message"
          type="submit"
        >
          {sending ? (
            <LoaderCircle className="animate-spin" size={19} />
          ) : (
            <Send size={19} />
          )}
          <span>Send</span>
        </motion.button>
      </form>
    </footer>
  );
}
