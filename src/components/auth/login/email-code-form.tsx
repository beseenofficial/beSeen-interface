import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LoginFlow } from './use-login-flow';

export function EmailCodeForm({ flow }: { flow: LoginFlow }) {
  return (
    <>
      <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-secondary transition-colors hover:text-brand" onClick={flow.resetEmailLogin} type="button">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to sign in
      </button>

      <span className="mt-6 grid size-12 place-items-center rounded-[14px] bg-info-bg text-brand">
        <Mail size={22} aria-hidden="true" />
      </span>
      <h2 id="welcome-title" className="mt-6 text-[30px] font-semibold leading-9 tracking-[-0.03em] text-navy">Check your email</h2>
      <p className="mt-3 text-sm leading-6 text-secondary">
        Enter the one-time code sent to{' '}
        <strong className="break-all font-semibold text-navy">{flow.email}</strong>.
      </p>

      {flow.codeNotice ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-success-bg px-4 py-3 text-sm leading-5 text-success" id="login-status" role="status" aria-live="polite">
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <span>{flow.codeNotice}</span>
        </div>
      ) : null}

      <form className={flow.codeNotice ? 'mt-5' : 'mt-7'} onSubmit={flow.verifyEmailCode}>
        <label className="text-xs font-semibold text-navy" htmlFor="login-code">Verification code</label>
        <input
          className="mt-2 min-h-11.5 w-full rounded-xl border border-border bg-white px-4 text-base tracking-[0.16em] text-navy outline-none transition-[border-color,box-shadow] placeholder:tracking-normal placeholder:text-muted focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)]"
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          minLength={6}
          name="code"
          onChange={(event) => flow.setCode(event.target.value)}
          pattern="[0-9]{6}"
          placeholder="6-digit code"
          required
          value={flow.code}
        />
        <Button className="mt-3 min-h-11.5 w-full shadow-[0_4px_10px_-6px_rgb(11_55_207/55%)]" loading={flow.activeMethod === 'email' && flow.emailLogin.isLoggingIn} type="submit">
          Verify and continue
        </Button>
        <button
          className="mt-3 inline-flex min-h-11.5 cursor-pointer items-center border-0 bg-transparent px-1 text-xs font-semibold text-brand hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          disabled={flow.methodPending || flow.resendCooldown > 0}
          onClick={() => void flow.resendEmailCode()}
          type="button"
        >
          {flow.resendCooldown > 0 ? `Send again in ${flow.resendCooldown}s` : 'Send a new code'}
        </button>
      </form>
    </>
  );
}
