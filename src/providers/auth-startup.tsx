'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SecureLoadingScreen } from '@/components/ui/states';

type AuthStartupContextValue = {
  pending: boolean;
  complete: () => void;
};

const AuthStartupContext = createContext<AuthStartupContextValue>({
  pending: false,
  complete: () => undefined,
});

export function AuthStartupBoundary({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(true);
  const complete = useCallback(() => setPending(false), []);
  const value = useMemo(() => ({ pending, complete }), [complete, pending]);

  return (
    <AuthStartupContext.Provider value={value}>
      <AnimatePresence>
        {pending && (
          <motion.div
            key="auth-startup"
            className="fixed inset-0 z-100"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <SecureLoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={pending ? 'invisible' : undefined}
        aria-hidden={pending || undefined}
        inert={pending || undefined}
      >
        {children}
      </div>
    </AuthStartupContext.Provider>
  );
}

export function useAuthStartup(): AuthStartupContextValue {
  return useContext(AuthStartupContext);
}
