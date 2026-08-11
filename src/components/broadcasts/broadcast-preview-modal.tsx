'use client';

import { Check, Copy, ExternalLink, ShieldCheck, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/providers/toast-provider';

const fullDate = new Intl.DateTimeFormat('en', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

type BroadcastPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  content: string;
  username: string;
  avatar: string | null;
  publishedAt: string;
  isOwn: boolean;
  recipientCount?: number;
};

export function BroadcastPreviewModal({
  open,
  onClose,
  content,
  username,
  avatar,
  publishedAt,
  isOwn,
  recipientCount,
}: BroadcastPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { toast } = useToast();

  useEffect(() => () => {
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
  }, []);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast('Broadcast copied', 'The complete message is on your clipboard.');
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1_800);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      initialFocusRef={closeButton}
      ariaLabelledBy={titleId}
      overlayClassName="bg-navy/35"
      className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-elevated"
    >
      <header className="flex items-start gap-3 border-b border-border px-6 py-5 max-sm:px-4">
        <Avatar username={username} src={avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold" id={titleId}>@{username}</h2>
          <time className="mt-0.5 block text-[11px] text-muted" dateTime={publishedAt}>{fullDate.format(new Date(publishedAt))}</time>
        </div>
        <button ref={closeButton} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent hover:bg-subtle" aria-label="Close broadcast" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>

      <div className="px-6 py-5 max-sm:px-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-bg px-2.5 py-1.5 font-semibold text-success"><ShieldCheck size={14} /> Verified broadcast</span>
          {isOwn && recipientCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-info-bg px-2.5 py-1.5 font-semibold text-brand"><UsersRound size={14} /> Sent to {recipientCount.toLocaleString()} follower{recipientCount === 1 ? '' : 's'}</span>
          )}
        </div>
        <p className="mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-subtle p-4 text-sm leading-6 text-navy [overflow-wrap:anywhere]">{content}</p>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-subtle/60 px-6 py-4 max-sm:px-4">
        <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-secondary hover:border-brand/25 hover:text-brand" href={`/u/${username}`} onClick={onClose}>
          <ExternalLink size={16} /> View public profile
        </Link>
        <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-transparent bg-brand px-4 text-xs font-semibold text-white hover:bg-[#0c3bd6]" onClick={copyMessage} type="button">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy message'}
        </button>
      </footer>
    </Modal>
  );
}
