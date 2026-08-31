'use client';

import { ArrowUp, LoaderCircle, Send } from 'lucide-react';
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
    bountyError,
    hasPendingRetry,
    messageInput,
    sending,
    handleMessageKeyDown,
    sendMessage,
    setDraft,
  } = workspace;
  return (
    <footer className="relative z-20 min-w-0 max-w-full overflow-x-hidden border-t border-white/75 bg-white/68 px-4 py-2.5 shadow-[0_-12px_32px_rgba(11,11,63,0.05)] backdrop-blur-2xl backdrop-saturate-150 max-sm:border-t-0 max-sm:bg-white max-sm:px-3 max-sm:pt-2 max-sm:shadow-none max-sm:backdrop-blur-none max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <MessageComposerStatus workspace={workspace} />
      <MessageReplyPreview workspace={workspace} />
      <form
        className="group/composer mx-auto grid w-full grid-cols-[44px_minmax(0,1fr)_auto_48px] items-end gap-2 rounded-2xl transition max-sm:grid-cols-[56px_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-1.5"
        onSubmit={sendMessage}
      >
        <span
          className="pointer-events-none hidden max-sm:col-start-2 max-sm:row-start-2 max-sm:block max-sm:min-h-12 max-sm:self-stretch max-sm:rounded-[26px] max-sm:bg-[#EFF3F4] max-sm:transition-colors max-sm:group-focus-within/composer:bg-[#E9EEF0]"
          aria-hidden="true"
        />
        <MessageEmojiPicker workspace={workspace} />
        <label className="relative z-10 col-start-2 row-start-1 block min-w-0 max-sm:col-start-2 max-sm:row-start-2 max-sm:pr-12">
          <span className="sr-only">Write a message</span>
          <textarea
            ref={messageInput}
            className="font-message block min-h-11 max-h-32 w-full resize-none overflow-x-hidden overflow-y-auto rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 max-sm:min-h-12 max-sm:rounded-full max-sm:px-4 max-sm:py-3 max-sm:text-[16px] max-sm:leading-6"
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
            'relative z-30 col-start-4 row-start-1 inline-grid min-h-11 cursor-pointer touch-manipulation place-items-center rounded-xl border-0 bg-brand px-0 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,69,245,0.24)] transition hover:bg-[#0c3bd6] disabled:cursor-not-allowed disabled:opacity-45 max-sm:col-start-2 max-sm:row-start-2 max-sm:mr-1 max-sm:size-10 max-sm:min-h-0 max-sm:justify-self-end max-sm:rounded-full max-sm:shadow-none',
          )}
          whileTap={{ scale: 0.97 }}
          disabled={
            sending ||
            hasPendingRetry ||
            !draft.trim() ||
            draftBytes > MAX_MESSENGER_BYTES
            || Boolean(bountyError)
          }
          aria-label="Send message"
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
