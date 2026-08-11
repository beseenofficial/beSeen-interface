'use client';

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FloatingPopover } from '@/components/messenger/floating-popover';
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
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const close = useCallback(() => setOpen(false), []);

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

      <FloatingPopover
        anchorRef={trigger}
        className="overflow-hidden rounded-xl border border-brand/10 bg-white p-1 shadow-[0_14px_40px_rgba(34,28,74,0.16)]"
        estimatedHeight={options.length * 40 + 8}
        id={listboxId}
        matchAnchorWidth
        minWidth={104}
        onClose={close}
        open={open}
        role="listbox"
        ariaLabel={label}
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
              {active && (
                <Check className="shrink-0" size={14} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </FloatingPopover>
    </>
  );
}
