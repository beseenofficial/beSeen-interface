'use client';

import { Clock3, Gift, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { BountySelect } from '@/components/messenger/bounty-select';
import { UsdcLogo } from '@/components/messenger/usdc-logo';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';
import type { BountyDurationUnit } from '@/components/messenger/use-message-composer';
import { cn } from '@/lib/utils';

const durationUnits: Array<{ label: string; shortLabel: string; value: BountyDurationUnit }> = [
  { label: 'Minutes', shortLabel: 'min', value: 'minute' },
  { label: 'Hours', shortLabel: 'hr', value: 'hour' },
  { label: 'Days', shortLabel: 'day', value: 'day' },
];

export function MessageBountyPanel({ workspace }: { workspace: MessengerWorkspaceState }) {
  const panelRef = useRef<HTMLElement>(null);
  const [showValidation, setShowValidation] = useState(false);
  const {
    bountyAmount,
    bountyAsset,
    bountyDurationUnit,
    bountyDurationValue,
    bountyError,
    bountyPanelOpen,
    demoUsdcBalance,
    setBountyAmount,
    setBountyDurationUnit,
    setBountyDurationValue,
    setBountyPanelOpen,
    setShowBounty,
  } = workspace;

  useEffect(() => {
    if (!bountyPanelOpen) return;
    setShowValidation(false);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBountyPanelOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [bountyPanelOpen, setBountyPanelOpen]);

  return (
    <AnimatePresence initial={false}>
      {bountyPanelOpen && (
        <motion.section
          ref={panelRef}
          className="absolute bottom-[calc(100%-0.25rem)] left-1/2 z-50 max-h-[min(500px,calc(100svh-110px))] w-[min(calc(100%-24px),400px)] overflow-y-auto rounded-[20px] border border-[#DCE7EA] bg-[#FFFEFB] p-4 shadow-[0_20px_55px_rgba(11,11,63,0.20)]"
          initial={{ opacity: 0, x: '-50%', y: 10, scale: 0.98 }}
          animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: 8, scale: 0.985 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          id="bounty-settings"
          role="dialog"
          aria-label="Add bounty"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FFF1A8] text-[#9B6700]">
              <Gift size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-navy">Add bounty</h2>
              <p className="truncate text-[10px] text-muted">Reward a reply before the deadline.</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#EEF2FF] px-2.5 py-1.5 text-xs font-semibold text-brand">
              <UsdcLogo className="size-[18px]" /> {bountyAsset}
            </span>
            <button
              className="grid size-8 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-navy"
              onClick={() => setBountyPanelOpen(false)}
              aria-label="Close bounty settings"
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-semibold text-secondary" htmlFor="bounty-amount">Amount</label>
            <div className="flex min-h-11 items-center rounded-xl border border-border bg-white px-3 transition focus-within:border-brand/45 focus-within:ring-3 focus-within:ring-brand/10">
              <UsdcLogo className="size-5" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-semibold text-navy outline-none placeholder:font-normal placeholder:text-muted"
                id="bounty-amount"
                inputMode="decimal"
                onChange={(event) => {
                  setBountyAmount(event.target.value.replace(/[^0-9.]/g, ''));
                  setShowValidation(true);
                }}
                placeholder="0.00"
                type="text"
                value={bountyAmount}
              />
              <span className="text-[11px] font-semibold text-secondary">{bountyAsset}</span>
            </div>
            <p className="mt-1.5 text-[9px] text-muted">Available: {demoUsdcBalance ?? 'loading'} demo USDC</p>
          </div>

          <div className="mt-3.5">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-secondary" htmlFor="bounty-duration-value">
              <Clock3 size={13} aria-hidden="true" /> Time to reply
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-2 max-[380px]:grid-cols-[minmax(0,1fr)_112px]">
              <input
                className="min-h-11 min-w-0 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-navy outline-none transition focus:border-brand/45 focus:ring-3 focus:ring-brand/10"
                id="bounty-duration-value"
                inputMode="numeric"
                onChange={(event) => {
                  setBountyDurationValue(event.target.value);
                  setShowValidation(true);
                }}
                placeholder="1"
                type="text"
                value={bountyDurationValue}
              />
              <BountySelect
                className="relative flex min-h-11 w-full items-center rounded-xl border border-border bg-white px-3 pr-8 text-xs font-semibold text-navy transition focus-within:border-brand/45 focus-within:ring-3 focus-within:ring-brand/10"
                label="Reply time unit"
                onChange={(value) => {
                  setBountyDurationUnit(value as BountyDurationUnit);
                  setShowValidation(true);
                }}
                options={durationUnits.map((unit) => ({ label: unit.label, value: unit.value }))}
                value={bountyDurationUnit}
              />
            </div>
          </div>

          {showValidation && bountyError && <p className="mt-2.5 text-[11px] text-error" role="alert">{bountyError}</p>}

          <button
            className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(16,69,245,0.20)] transition hover:bg-[#0C3BD6] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={showValidation && Boolean(bountyError)}
            onClick={() => {
              setShowValidation(true);
              if (bountyError) return;
              setShowBounty(true);
              setBountyPanelOpen(false);
            }}
            type="button"
          >
            <UsdcLogo className="size-5" /> Attach {bountyAmount || '0'} {bountyAsset}
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

export function MessageBountyControls({ workspace }: { workspace: MessengerWorkspaceState }) {
  const {
    bountyAmount,
    bountyAsset,
    bountyDurationUnit,
    bountyDurationValue,
    bountyPanelOpen,
    hasPendingRetry,
    showBounty,
    setBountyPanelOpen,
  } = workspace;
  const unit = durationUnits.find((item) => item.value === bountyDurationUnit)?.shortLabel ?? 'hr';

  return (
    <motion.button
      className={cn(
        'col-start-3 row-start-1 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition max-sm:hidden',
        showBounty || bountyPanelOpen
          ? 'border-[#E7C85B] bg-[#FFF7CC] text-navy'
          : 'border-border bg-white text-navy hover:border-[#E7C85B] hover:bg-[#FFF9DD]',
      )}
      whileTap={{ scale: 0.97 }}
      disabled={hasPendingRetry}
      onClick={() => setBountyPanelOpen((current) => !current)}
      aria-expanded={bountyPanelOpen}
      aria-controls="bounty-settings"
      aria-label={showBounty ? `Edit ${bountyAmount} ${bountyAsset} bounty` : 'Add bounty'}
      type="button"
    >
      <Gift className="shrink-0 text-warning" size={16} />
      <span>{showBounty ? `${bountyAmount} ${bountyAsset} · ${bountyDurationValue} ${unit}` : 'Add bounty'}</span>
    </motion.button>
  );
}
