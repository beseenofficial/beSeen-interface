'use client';

import { LoginAccessPanel } from './login-access-panel';
import { LoginBrandPanel } from './login-brand-panel';
import { useLoginFlow } from './use-login-flow';

export function LoginScreen() {
  const flow = useLoginFlow();

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-white min-[901px]:h-svh min-[901px]:overflow-hidden">
      <div className="relative z-10 grid min-h-svh w-full bg-white min-[901px]:h-svh min-[901px]:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
        <LoginBrandPanel />
        <LoginAccessPanel flow={flow} />
        <footer className="order-3 flex items-center justify-center bg-white px-6 pb-7 text-xs text-secondary min-[901px]:hidden">
          <span>© 2026 BeSeen</span>
        </footer>
      </div>
    </main>
  );
}
