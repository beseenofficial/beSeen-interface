'use client';

import { CircleDollarSign, Gift } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { BountySelect } from '@/components/messenger/bounty-select';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function MessageBountyControls({ workspace }: { workspace: MessengerWorkspaceState }) {
  const {
    bountyAmount,
    bountyAsset,
    bountyDuration,
    showBounty,
    setBountyAmount,
    setBountyAsset,
    setBountyDuration,
    setShowBounty,
  } = workspace;
  return (
    <AnimatePresence initial={false} mode="wait">
      {showBounty ? (
        <motion.div
          className="col-start-3 row-start-1 flex min-w-0 justify-self-end gap-2 max-[1450px]:col-span-4 max-[1450px]:col-start-1 max-[1450px]:row-start-2 max-[1450px]:w-full max-[1450px]:justify-end max-[1450px]:overflow-x-auto"
          key="bounty-settings"
          initial={{ opacity: 0, x: 10, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          aria-label="Demo reward settings"
          id="bounty-settings"
        >
          <BountySelect
            className="relative flex min-h-11 w-29 shrink-0 items-center rounded-xl border border-border bg-white pl-9 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35"
            icon={<CircleDollarSign className="absolute left-2.5 text-brand" size={20} aria-hidden="true" />}
            label="Bounty asset"
            options={[{ label: 'USDC', value: 'USDC' }]}
            value={bountyAsset}
            onChange={setBountyAsset}
          />
          <BountySelect
            className="relative flex min-h-11 w-19 shrink-0 items-center rounded-xl border border-border bg-white px-3 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35"
            label="Bounty amount"
            options={[
              { label: '5', value: '5' },
              { label: '10', value: '10' },
              { label: '25', value: '25' },
            ]}
            value={bountyAmount}
            onChange={setBountyAmount}
          />
          <BountySelect
            className="relative flex min-h-11 w-21 shrink-0 items-center rounded-xl border border-border bg-white px-3 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35"
            label="Time to reply"
            options={[
              { label: '1h', value: '3600' },
              { label: '1d', value: '86400' },
              { label: '1w', value: '604800' },
              { label: '30d', value: '2592000' },
            ]}
            value={bountyDuration}
            onChange={setBountyDuration}
          />
          <button className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-brand/20 bg-info-bg text-brand transition hover:border-brand/40" onClick={() => setShowBounty(false)} aria-label="Remove bounty" type="button"><Gift size={19} /></button>
        </motion.div>
      ) : (
        <motion.button
          className="col-start-3 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-semibold text-navy transition hover:border-lime hover:bg-lime/15 max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-end"
          key="bounty-trigger"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.16 }}
          onClick={() => setShowBounty(true)}
          aria-expanded="false"
          aria-controls="bounty-settings"
          type="button"
        >
          <Gift className="text-warning" size={17} /> Demo bounty
        </motion.button>
      )}
    </AnimatePresence>
  );
}
