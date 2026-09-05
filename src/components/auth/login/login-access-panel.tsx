import { EmailCodeForm } from './email-code-form';
import { EmailSignInForm } from './email-sign-in-form';
import { SignatureSignIn } from './signature-sign-in';
import type { LoginFlow } from './use-login-flow';

export function LoginAccessPanel({ flow }: { flow: LoginFlow }) {
  const content =
    flow.auth.status === 'sign-required' ? (
      <SignatureSignIn flow={flow} />
    ) : flow.emailLogin.isCodeSent ? (
      <EmailCodeForm flow={flow} />
    ) : (
      <EmailSignInForm flow={flow} />
    );

  return (
    <section
      className="relative z-20 order-1 flex bg-white px-6 py-10 sm:px-12 sm:py-14 min-[901px]:order-none min-[901px]:items-center min-[901px]:px-[clamp(46px,5vw,78px)] min-[901px]:py-12"
      aria-labelledby="welcome-title"
    >
      <div className="mx-auto w-full max-w-[420px]">{content}</div>
    </section>
  );
}
