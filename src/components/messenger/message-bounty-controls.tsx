'use client';

import { ArrowLeft, CircleDollarSign, Gift } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BountySelect } from '@/components/messenger/bounty-select';
import type { MessengerWorkspaceState } from '@/components/messenger/use-messenger-workspace';

export function MessageBountyControls({ workspace }: { workspace: MessengerWorkspaceState }) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const {
    bountyAmount,
    bountyAsset,
    bountyDuration,
    bountyError,
    demoUsdcBalance,
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
          className="col-start-3 row-start-1 flex min-w-0 justify-self-end gap-2 max-[1450px]:col-span-4 max-[1450px]:col-start-1 max-[1450px]:row-start-2 max-[1450px]:w-full max-[1450px]:justify-end max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-1 max-sm:grid max-sm:grid-cols-[1.15fr_.75fr_.85fr_40px] max-sm:gap-1.5 max-sm:overflow-visible"
          key="bounty-settings"
          initial={mobile
            ? { opacity: 0, y: 8, scale: 0.985, filter: 'blur(6px)' }
            : { opacity: 0, x: 10, scale: 0.97 }}
          animate={mobile
            ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
            : { opacity: 1, x: 0, scale: 1 }}
          exit={mobile
            ? {
                opacity: 0,
                y: 2,
                scale: 0.995,
                filter: 'blur(0px)',
                transition: { duration: 0.12, ease: 'easeOut' },
              }
            : { opacity: 0, x: 8, scale: 0.98 }}
          transition={mobile
            ? { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.2, ease: 'easeOut' }}
          aria-label="Bounty settings"
          id="bounty-settings"
        >
          <BountySelect
            className="relative flex min-h-11 w-29 shrink-0 items-center rounded-xl border border-border bg-white pl-9 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35 max-sm:w-auto max-sm:min-w-0 max-sm:pl-8 max-sm:pr-5"
            icon={<CircleDollarSign className="absolute left-2.5 text-brand" size={20} aria-hidden="true" />}
            label="Bounty asset"
            options={[{ label: 'USDC', value: 'USDC' }]}
            value={bountyAsset}
            onChange={setBountyAsset}
          />
          <label className="relative flex min-h-11 w-24 shrink-0 items-center rounded-xl border border-border bg-white px-3 text-xs font-semibold text-navy transition focus-within:border-brand/35 max-sm:w-auto max-sm:min-w-0 max-sm:px-2">
            <span className="sr-only">Bounty amount in USDC</span>
            <input
              className="min-w-0 w-full border-0 bg-transparent outline-none"
              inputMode="decimal"
              maxLength={24}
              value={bountyAmount}
              onChange={(event) => setBountyAmount(event.target.value.trim())}
              aria-invalid={bountyError ? true : undefined}
              aria-describedby="bounty-balance"
            />
          </label>
          <BountySelect
            className="relative flex min-h-11 w-21 shrink-0 items-center rounded-xl border border-border bg-white px-3 pr-7 text-xs font-semibold text-navy transition focus-within:border-brand/35 max-sm:w-auto max-sm:min-w-0 max-sm:px-2 max-sm:pr-5"
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
          <button className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-brand/20 bg-info-bg text-brand transition hover:border-brand/40 max-sm:size-10 max-sm:self-center" onClick={() => setShowBounty(false)} aria-label="Cancel bounty" type="button"><ArrowLeft size={19} /></button>
          <span className="sr-only" id="bounty-balance">Available demo balance: {demoUsdcBalance ?? 'loading'} USDC</span>
        </motion.div>
      ) : (
        <motion.button
          className="col-start-3 row-start-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-semibold text-navy transition hover:border-lime hover:bg-lime/15 max-sm:hidden"
          key="bounty-trigger"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.16 }}
          onClick={() => setShowBounty(true)}
          aria-expanded="false"
          aria-controls="bounty-settings"
          aria-label="Add bounty"
          type="button"
        >
          <Gift className="shrink-0 text-warning" size={17} />
          <span className="max-[360px]:sr-only">Add bounty</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
