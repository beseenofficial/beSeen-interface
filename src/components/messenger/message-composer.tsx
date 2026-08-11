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
    handleMessageKeyDown,
    sendMessage,
    setDraft,
  } = workspace;
  return (
    <footer className="min-w-0 max-w-full overflow-x-hidden border-t border-border bg-white px-4 py-2 max-sm:px-3 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <MessageComposerStatus workspace={workspace} />
      <MessageReplyPreview workspace={workspace} />
      <form
        className="group/composer mx-auto grid w-full grid-cols-[44px_minmax(0,1fr)_auto_auto] items-end gap-2 rounded-2xl p-2 transition max-sm:grid-cols-[44px_minmax(0,1fr)_auto_52px] max-sm:items-center max-sm:gap-x-0 max-sm:gap-y-2 max-sm:p-0"
        onSubmit={sendMessage}
      >
        <span
          className="hidden max-sm:col-span-3 max-sm:col-start-1 max-sm:row-start-2 max-sm:block max-sm:min-h-11 max-sm:self-stretch max-sm:rounded-[22px] max-sm:border max-sm:border-border max-sm:bg-subtle max-sm:transition-colors max-sm:group-focus-within/composer:border-brand/35"
          aria-hidden="true"
        />
        <MessageEmojiPicker workspace={workspace} />
        <label className="relative col-start-2 row-start-1 block min-w-0 max-sm:row-start-2">
          <span className="sr-only">Write a message</span>
          <textarea
            ref={messageInput}
            className="block min-h-11 max-h-32 w-full resize-none overflow-x-hidden overflow-y-auto rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 max-sm:rounded-r-full max-sm:px-2 max-sm:pr-4"
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
            wrap="soft"
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
            'col-start-4 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45 max-sm:col-start-4 max-sm:row-start-2 max-sm:ml-2 max-sm:size-11 max-sm:min-h-0 max-sm:rounded-full max-sm:px-0',
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
            <Send className="max-sm:translate-x-px" size={19} />
          )}
          <span className="max-sm:sr-only">Send</span>
        </motion.button>
      </form>
    </footer>
  );
}
