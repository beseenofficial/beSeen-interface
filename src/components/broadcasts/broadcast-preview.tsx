'use client';

import { Check, Copy, ExternalLink, ShieldCheck, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/toast-provider';

const fullDate = new Intl.DateTimeFormat('en', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

type BroadcastPreviewProps = {
  content: string;
  username: string;
  avatar: string | null;
  publishedAt: string;
  isOwn?: boolean;
  recipientCount?: number;
  className?: string;
};

export function BroadcastPreview({
  content,
  username,
  avatar,
  publishedAt,
  isOwn = false,
  recipientCount,
  className,
}: BroadcastPreviewProps) {
  const [overflowing, setOverflowing] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const viewFullButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const titleId = useId();
  const { toast } = useToast();

  const openModal = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setModalMounted(true);
    window.requestAnimationFrame(() => {
      setModalVisible(true);
      closeButton.current?.focus();
    });
  };

  const closeModal = useCallback(() => {
    setModalVisible(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setModalMounted(false);
      viewFullButton.current?.focus();
      closeTimer.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

  useEffect(() => {
    if (!modalMounted) return;
    const body = document.body;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeModal, modalMounted]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast('Broadcast copied', 'The complete message is on your clipboard.');
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <span className={cn('flex min-w-0 items-center gap-2', className)}>
        <span
          ref={textRef}
          className="min-w-0 max-w-[16ch] flex-1 truncate [overflow-wrap:anywhere] sm:max-w-[24ch] md:max-w-[32ch] lg:max-w-[40ch] xl:max-w-[48ch]"
        >
          {content}
        </span>
        {overflowing && (
          <button ref={viewFullButton} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[10px] font-semibold text-brand hover:underline" onClick={openModal} type="button">
            View full
          </button>
        )}
      </span>

      {modalMounted && createPortal(
        <div
          className={cn(
            'fixed inset-0 z-100 grid place-items-center bg-navy/35 p-4 backdrop-blur-[2px] transition-opacity duration-200 ease-out',
            modalVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
          onMouseDown={closeModal}
          role="presentation"
        >
          <section
            className={cn(
              'relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-elevated transition-[opacity,transform] duration-200 ease-out',
              modalVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0',
            )}
            aria-labelledby={titleId}
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="flex items-start gap-3 border-b border-border px-6 py-5 max-sm:px-4">
              <Avatar username={username} src={avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold" id={titleId}>@{username}</h2>
                <time className="mt-0.5 block text-[11px] text-muted" dateTime={publishedAt}>{fullDate.format(new Date(publishedAt))}</time>
              </div>
              <button ref={closeButton} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent hover:bg-subtle" aria-label="Close broadcast" onClick={closeModal} type="button">
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
              <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-secondary hover:border-brand/25 hover:text-brand" href={`/u/${username}`} onClick={closeModal}>
                <ExternalLink size={16} /> View public profile
              </Link>
              <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-transparent bg-brand px-4 text-xs font-semibold text-white hover:bg-[#0c3bd6]" onClick={copyMessage} type="button">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy message'}
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
