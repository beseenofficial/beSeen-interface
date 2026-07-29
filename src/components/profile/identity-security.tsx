import { ExternalLink, ShieldCheck } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { shortenAddress } from '@/lib/utils';

interface IdentitySecurityProps {
  publicKey: string | null;
}

export function IdentitySecurity({ publicKey }: IdentitySecurityProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 max-sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Identity &amp; security</h2>
          <p className="mt-1.5 text-sm text-secondary">
            Your identity is secure and verifiable.
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-100 bg-success-bg px-3 text-xs font-semibold text-success">
          <ShieldCheck size={17} /> Secure identity{' '}
          <i className="size-2 rounded-full bg-emerald-500" />
        </span>
      </div>
      <div className="mt-6">
        <span className="text-xs font-semibold">Public key</span>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border pl-4 max-sm:flex-col max-sm:items-stretch max-sm:p-3">
          <span className="min-w-0 truncate text-sm font-semibold max-sm:break-all max-sm:whitespace-normal">
            {publicKey
              ? shortenAddress(publicKey)
              : 'Reconnect your wallet to unlock local keys.'}
          </span>
          {publicKey && <CopyButton value={publicKey} label="Copy" />}
        </div>
        <p className="mt-2 max-w-[640px] text-xs leading-5 text-muted">
          This key is derived from your verified wallet signature and is used to
          confirm your identity across BeSeen.
        </p>
      </div>
      <a
        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline"
        href="#identity-security"
      >
        Learn more about identity &amp; security <ExternalLink size={15} />
      </a>
    </section>
  );
}
