import { AlertCircle, KeyRound, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscordMark, GitHubMark, GoogleMark } from './provider-icons';
import type { LoginFlow } from './use-login-flow';

export function EmailSignInForm({ flow }: { flow: LoginFlow }) {
  return (
    <>
      <h2 id="welcome-title" className="text-[30px] font-semibold leading-9 tracking-[-0.03em] text-navy min-[901px]:text-[34px] min-[901px]:leading-10">
        Welcome to BeSeen
      </h2>
      <p className="mt-2 text-sm leading-6 text-secondary">
        Sign in or create your account. Email is the quickest way in.
      </p>

      <form className="mt-7" noValidate onSubmit={flow.sendEmailCode}>
        <label className="text-xs font-semibold text-navy" htmlFor="login-email">Email address</label>
        <input
          className={`mt-2 min-h-11.5 w-full rounded-xl border bg-white px-4 text-sm text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-brand focus:shadow-[0_0_0_3px_rgb(16_69_245/10%)] ${flow.emailValidationError ? 'border-error' : 'border-border'}`}
          id="login-email"
          aria-describedby={flow.emailValidationError ? 'login-email-error' : undefined}
          aria-invalid={Boolean(flow.emailValidationError)}
          autoComplete="email"
          name="email"
          onBlur={flow.validateEmailOnBlur}
          onChange={(event) => flow.updateEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={flow.email}
        />
        <div
          className={`grid transition-[grid-template-rows,opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${flow.emailValidationError ? 'grid-rows-[1fr] translate-y-0 opacity-100' : 'grid-rows-[0fr] -translate-y-1 opacity-0'}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="overflow-hidden">
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-error-bg/70 px-3 py-2.5 text-xs leading-5 text-error" id="login-email-error" role={flow.emailValidationError ? 'alert' : undefined}>
              <AlertCircle className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
              <span>{flow.emailValidationError}</span>
            </div>
          </div>
        </div>
        <Button
          className="mt-3 min-h-11.5 w-full shadow-[0_4px_10px_-6px_rgb(11_55_207/55%)]"
          loading={flow.activeMethod === 'email' && flow.emailLogin.isSendingCode}
          type="submit"
        >
          Email me a code
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-[11px] font-medium text-muted">or use Google</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <Button className="w-full" disabled={flow.methodPending} icon={<GoogleMark />} loading={flow.activeMethod === 'google'} onClick={() => void flow.loginWithOAuth('google')} type="button" variant="secondary">
        Continue with Google
      </Button>

      <div className="mt-3 rounded-2xl bg-subtle p-3">
        <div className="grid grid-cols-2 gap-2.5" aria-label="Other sign-in methods">
          <Button className="px-3 text-xs" disabled={flow.methodPending} icon={<KeyRound size={16} aria-hidden="true" />} loading={flow.activeMethod === 'passkey'} onClick={() => void flow.loginWithPasskey()} type="button" variant="secondary">Passkey</Button>
          <Button className="px-3 text-xs" disabled={flow.methodPending} icon={<WalletCards size={16} aria-hidden="true" />} loading={flow.activeMethod === 'wallet'} onClick={() => void flow.loginWithWallet()} type="button" variant="secondary">Wallet</Button>
          <Button className="px-3 text-xs" disabled={flow.methodPending} icon={<DiscordMark />} loading={flow.activeMethod === 'discord'} onClick={() => void flow.loginWithOAuth('discord')} type="button" variant="secondary">Discord</Button>
          <Button className="px-3 text-xs" disabled={flow.methodPending} icon={<GitHubMark />} loading={flow.activeMethod === 'github'} onClick={() => void flow.loginWithOAuth('github')} type="button" variant="secondary">GitHub</Button>
        </div>
      </div>
    </>
  );
}
