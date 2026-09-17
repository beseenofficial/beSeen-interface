import { Modal } from '@/components/ui/modal';

export function PurchaseConfirmationModal({
  open,
  username,
  followingBusy,
  priceLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  username: string;
  followingBusy: boolean;
  /** Formatted Aura price for display (e.g. "1.5"); null when unavailable. */
  priceLabel: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Confirm Aura purchase"
      closeOnBackdrop={!followingBusy}
      closeOnEscape={!followingBusy}
    >
      <div className="w-[min(calc(100vw-32px),420px)] rounded-3xl border border-border bg-white p-6 shadow-elevated">
        <h2 className="text-lg font-semibold text-navy">Confirm purchase</h2>
        <p className="mt-3 text-sm leading-6 text-secondary">
          You are about to purchase Aura to subscribe to{' '}
          <span className="font-semibold text-navy">@{username}</span>
          &apos;s broadcasts. This will execute a Stellar transaction from your
          connected wallet.
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
        <p className="mt-2 text-sm leading-6 text-secondary">
          Do you want to continue?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border bg-white px-4 text-sm font-semibold text-navy transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
            disabled={followingBusy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(16,69,245,0.20)] transition hover:bg-[#0C3BD6] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={followingBusy || priceLabel === null}
            onClick={onConfirm}
            type="button"
          >
            {followingBusy ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
