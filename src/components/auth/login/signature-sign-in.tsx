import { ArrowRight, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/utils';
import type { LoginFlow } from './use-login-flow';

export function SignatureSignIn({ flow }: { flow: LoginFlow }) {
  return (
    <>
      <span className="grid size-12 place-items-center rounded-[14px] bg-info-bg text-brand shadow-[0_10px_24px_-16px_rgb(16_69_245/70%)]">
        <PenLine size={23} aria-hidden="true" />
      </span>
      <h2 id="welcome-title" className="mt-7 text-[30px] font-semibold leading-9 tracking-[-0.03em] text-navy min-[901px]:text-[34px] min-[901px]:leading-10">One signature to go</h2>
      <p className="mt-3 max-w-[390px] text-sm leading-6 text-secondary">
        {`You're connected as ${shortenAddress(flow.auth.address ?? '')}. Approve one small signature in your wallet to unlock your BeSeen keys — it changes nothing on the Stellar network.`}
      </p>
      <Button className="mt-8 min-h-14 w-full shadow-[0_3px_7px_-3px_rgb(11_55_207/45%)]" onClick={() => void flow.continueWithSignature()} loading={flow.signatureWorking} icon={<ArrowRight size={20} aria-hidden="true" />} type="button">
        {flow.signatureWorking ? 'Opening secure sign-in…' : 'Sign to continue'}
      </Button>
      <button className="mt-3 w-fit cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-muted underline decoration-[#aeb8d1] underline-offset-4 transition-colors hover:text-brand" onClick={() => flow.auth.logout()} type="button">
        Use a different account
      </button>
    </>
  );
}
