'use client';

import { useEffect, useRef, useState } from 'react';
import { BroadcastPreviewModal } from '@/components/broadcasts/broadcast-preview-modal';
import { cn } from '@/lib/utils';

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
  const [modalOpen, setModalOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

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
          <button className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[10px] font-semibold text-brand hover:underline" onClick={() => setModalOpen(true)} type="button">
            View full
          </button>
        )}
      </span>

      <BroadcastPreviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        content={content}
        username={username}
        avatar={avatar}
        publishedAt={publishedAt}
        isOwn={isOwn}
        recipientCount={recipientCount}
      />
    </>
  );
}
