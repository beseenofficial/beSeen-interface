'use client';

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type ModalPlacement = 'center' | 'left';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  placement?: ModalPlacement;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const modalStack: symbol[] = [];
let scrollLockCount = 0;
let bodyOverflow = '';
let bodyPaddingRight = '';

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    const body = document.body;
    bodyOverflow = body.style.overflow;
    bodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = bodyOverflow;
    document.body.style.paddingRight = bodyPaddingRight;
  }
}

const centeredPanelVariants: Variants = {
  initial: { opacity: 0, y: 22, scale: 0.975 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 480, damping: 36, mass: 0.72 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.985,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const leftPanelVariants: Variants = {
  initial: { opacity: 0.8, x: '-100%' },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 430, damping: 40, mass: 0.8 },
  },
  exit: {
    opacity: 0.8,
    x: '-100%',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

const reducedPanelVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export function Modal({
  open,
  onClose,
  children,
  className,
  overlayClassName,
  placement = 'center',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocusRef,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef(Symbol('modal'));
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const modalId = modalIdRef.current;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(modalId);
    lockBodyScroll();

    const focusFrame = window.requestAnimationFrame(() => {
      const preferredTarget = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      const fallbackTarget = panelRef.current?.querySelector<HTMLElement>(focusableSelector) ?? panelRef.current;
      (preferredTarget ?? fallbackTarget)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== modalId) return;
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      const stackIndex = modalStack.lastIndexOf(modalId);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      unlockBodyScroll();
      previousFocusRef.current?.focus();
    };
  }, [closeOnEscape, initialFocusRef, open]);

  if (typeof document === 'undefined') return null;

  const closeFromBackdrop = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (
      closeOnBackdrop &&
      event.target === event.currentTarget &&
      modalStack.at(-1) === modalIdRef.current
    ) {
      onCloseRef.current();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-100 flex overflow-y-auto bg-navy/45 backdrop-blur-[2px]',
            placement === 'center' ? 'items-center justify-center p-4 max-sm:p-2.5' : 'items-stretch justify-start',
            overlayClassName,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.2, ease: 'easeOut' }}
          onMouseDown={closeFromBackdrop}
          role="presentation"
        >
          <motion.div
            ref={panelRef}
            className={cn(
              'relative outline-none',
              placement === 'center' && 'my-auto',
              className,
            )}
            variants={shouldReduceMotion ? reducedPanelVariants : placement === 'left' ? leftPanelVariants : centeredPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
