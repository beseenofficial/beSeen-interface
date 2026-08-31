'use client';

import {
  useCallback,
  useEffect,
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
  }, [open, selectedIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      close();
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

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    else if (event.key === 'ArrowUp') nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    } else if (event.key === 'Tab') {
      setOpen(false);
      return;
    } else return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
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
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              ref={(node) => { optionRefs.current[index] = node; }}
              className={cn(
                'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                active
                  ? 'bg-info-bg text-brand'
                  : 'text-navy hover:bg-subtle',
              )}
              key={option.value}
              onClick={() => selectOption(option.value)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              aria-selected={active}
              role="option"
              tabIndex={activeIndex === index ? 0 : -1}
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
