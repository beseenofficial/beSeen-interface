import type { ComponentPropsWithoutRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type MessageBubbleTone = 'incoming' | 'outgoing' | 'broadcast';
type MessageBubbleShadow = 'soft' | 'subtle';

type MessageBubbleProps = ComponentPropsWithoutRef<'div'> & {
  tone: MessageBubbleTone;
  padding?: 'default' | 'none';
  shadow?: MessageBubbleShadow;
};

export function MessageBubble({
  children,
  className,
  padding = 'default',
  shadow = 'subtle',
  tone,
  ...props
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'relative min-w-0 max-w-[min(54%,540px)] rounded-[13px] max-sm:max-w-[78%]',
        padding === 'default' ? 'px-[18px] py-[10px]' : 'overflow-hidden',
        shadow === 'soft' ? 'shadow-none' : 'shadow-none',
        tone === 'outgoing' && 'bg-[#4F9EEF] text-white',
        tone === 'incoming' && 'bg-[#F1F4F5] text-[#080B0D]',
        tone === 'broadcast' && 'border border-brand/18 bg-[#F5F7FF] text-navy shadow-[0_8px_24px_rgba(16,69,245,0.07)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageBubbleAvatar({
  avatar,
  outgoing,
  visible = true,
  username,
}: {
  avatar: string | null;
  outgoing: boolean;
  visible?: boolean;
  username: string;
}) {
  if (!visible) {
    return (
      <span
        className={cn('size-9 shrink-0 max-sm:hidden', outgoing && 'order-2')}
        aria-hidden="true"
      />
    );
  }

  return (
    <Avatar
      className={cn('size-9 shrink-0 max-sm:hidden', outgoing && 'order-2')}
      username={username}
      src={avatar}
      size="sm"
    />
  );
}
