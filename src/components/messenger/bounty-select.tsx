'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BountySelectOption = {
  label: string;
  value: string;
};

export function BountySelect({
  className,
  icon,
  label,
  onChange,
  options,
  value,
}: {
  className: string;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: BountySelectOption[];
  value: string;
}) {
  const listboxId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [opensAbove, setOpensAbove] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function positionMenu() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = options.length * 40 + 8;
      const above = window.innerHeight - rect.bottom < estimatedHeight + 12;
      setOpensAbove(above);
      setMenuStyle({
        left: rect.left,
        minWidth: Math.max(rect.width, 104),
        width: rect.width,
        ...(above
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      });
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || menu.current?.contains(target)) return;
      setOpen(false);
    }

    positionMenu();
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open, options.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <>
      <button
        ref={trigger}
        className={cn(className, 'cursor-pointer outline-none')}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        type="button"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-2 text-muted transition-transform duration-200',
            open && 'rotate-180 text-brand',
          )}
          size={15}
          aria-hidden="true"
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menu}
                className="fixed z-[100] overflow-hidden rounded-xl border border-brand/10 bg-white p-1 shadow-[0_14px_40px_rgba(34,28,74,0.16)]"
                style={menuStyle}
                initial={{ opacity: 0, y: opensAbove ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: opensAbove ? 4 : -4, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                id={listboxId}
                role="listbox"
                aria-label={label}
              >
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      className={cn(
                        'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition-colors',
                        active
                          ? 'bg-info-bg text-brand'
                          : 'text-navy hover:bg-subtle',
                      )}
                      key={option.value}
                      onClick={() => selectOption(option.value)}
                      aria-selected={active}
                      role="option"
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {active && <Check className="shrink-0" size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
