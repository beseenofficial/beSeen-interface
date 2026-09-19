import { LoaderCircle, RadioTower, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

export function PurchaseConfirmationModal({
  open,
  username,
  processing,
  phaseLabel,
  error,
  pendingConfirmation,
  priceLabel,
  onClose,
  onConfirm,
  onRetryConfirmation,
}: {
  open: boolean;
  username: string;
  processing: boolean;
  phaseLabel: string | null;
  error: string | null;
  pendingConfirmation: boolean;
  /** Formatted Aura price for display (e.g. "1.5"); null when unavailable. */
  priceLabel: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onRetryConfirmation: () => void;
}) {
  const recovery = pendingConfirmation && !processing;

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Confirm Aura purchase"
      closeOnBackdrop={!processing}
      closeOnEscape={!processing}
    >
      <div className="w-[min(calc(100vw-32px),420px)] rounded-3xl bg-white p-6 shadow-[0_22px_60px_rgba(11,11,63,0.18)] max-sm:p-5">
        {processing ? (
          <div className="py-5 text-center" role="status" aria-live="polite">
            <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-info-bg text-brand">
              <RadioTower size={25} strokeWidth={1.8} aria-hidden="true" />
              <LoaderCircle className="absolute -inset-1 size-[72px] animate-spin text-brand/35" strokeWidth={1.4} aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-navy">Purchasing Aura</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-brand">
              {phaseLabel ?? 'Processing your purchase…'}
            </p>
            <p className="mx-auto mt-2 max-w-[32ch] text-xs leading-5 text-secondary">
              Keep this window open while your wallet and the Stellar network confirm the transaction.
            </p>
          </div>
        ) : recovery ? (
          <div>
            <span className="grid size-11 place-items-center rounded-xl bg-info-bg text-brand">
              <RotateCcw size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-navy">Finalizing purchase</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Your Aura purchase is confirmed on-chain. BeSeen still needs to finish enabling access to @{username}.
            </p>
            {error && (
              <p className="mt-3 rounded-xl bg-error-bg px-3 py-2.5 text-sm leading-5 text-error" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border bg-white px-4 text-sm font-semibold text-navy transition hover:bg-subtle"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
              <button
                className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(16,69,245,0.20)] transition hover:bg-[#0C3BD6]"
                onClick={onRetryConfirmation}
                type="button"
              >
                <RotateCcw size={16} aria-hidden="true" /> Retry
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-navy">Confirm purchase</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              You are about to purchase Aura to subscribe to{' '}
              <span className="font-semibold text-navy">@{username}</span>
              &apos;s broadcasts. This will execute a Stellar transaction from your connected wallet.
            </p>
            <p className="mt-2 text-sm leading-6 text-secondary">
              {priceLabel !== null ? (
                <>
                  Current Aura price:{' '}
                  <strong className="tabular-nums text-navy">{priceLabel} USDC</strong>
                  . The final price is set by the contract at execution time.
                </>
              ) : (
                'The current Aura price is temporarily unavailable, so purchasing is paused. Close this dialog and retry loading the profile.'
              )}
            </p>
            {error ? (
              <p className="mt-3 rounded-xl bg-error-bg px-3 py-2.5 text-sm leading-5 text-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-secondary">Do you want to continue?</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border bg-white px-4 text-sm font-semibold text-navy transition hover:bg-subtle"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-11 flex-1 cursor-pointer rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(16,69,245,0.20)] transition hover:bg-[#0C3BD6] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={priceLabel === null}
                onClick={onConfirm}
                type="button"
              >
                {error ? 'Try again' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
