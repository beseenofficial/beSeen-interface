'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type AriaRole,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function FloatingPopover<T extends HTMLElement>({
  anchorRef,
  ariaLabel,
  children,
  className,
  estimatedHeight,
  id,
  matchAnchorWidth = false,
  minWidth = 0,
  onClose,
  open,
  role,
}: {
  anchorRef: RefObject<T | null>;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  estimatedHeight: number;
  id?: string;
  matchAnchorWidth?: boolean;
  minWidth?: number;
  onClose: () => void;
  open: boolean;
  role?: AriaRole;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [opensAbove, setOpensAbove] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const above = window.innerHeight - rect.bottom < estimatedHeight + 12;
      setOpensAbove(above);
      setStyle({
        left: rect.left,
        minWidth,
        ...(matchAnchorWidth ? { width: rect.width } : {}),
        ...(above
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      });
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, estimatedHeight, matchAnchorWidth, minWidth, onClose, open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          className={cn('fixed z-[100]', className)}
          style={style}
          initial={{ opacity: 0, y: opensAbove ? 6 : -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: opensAbove ? 4 : -4, scale: 0.97 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          id={id}
          role={role}
          aria-label={ariaLabel}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
