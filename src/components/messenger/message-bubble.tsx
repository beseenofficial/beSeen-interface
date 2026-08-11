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
        'min-w-0 max-w-[min(62%,560px)] rounded-2xl max-sm:max-w-[90%]',
        padding === 'default' ? 'px-4 py-3' : 'overflow-hidden',
        shadow === 'soft'
          ? 'shadow-[0_8px_24px_rgba(40,30,70,0.06)]'
          : 'shadow-[0px_2px_3px_rgba(40,30,70,0.04)]',
        tone === 'outgoing' && 'rounded-br-md bg-info-bg text-navy',
        tone === 'incoming' && 'rounded-bl-md bg-white text-navy',
        tone === 'broadcast' && 'rounded-bl-md bg-info-bg text-navy',
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
  username,
}: {
  avatar: string | null;
  outgoing: boolean;
  username: string;
}) {
  return (
    <Avatar
      className={cn('size-9', outgoing && 'order-2 min-[1440px]:order-first')}
      username={username}
      src={avatar}
      size="sm"
    />
  );
}
