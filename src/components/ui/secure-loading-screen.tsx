'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BrandLogo } from './brand-logo';

const easeOut = [0.22, 1, 0.36, 1] as const;

export function SecureLoadingScreen({
  label = 'Signing you in…',
}: {
  label?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-ice px-5 py-8 text-center"
      initial={{ opacity: reduceMotion ? 1 : 0.86 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: easeOut }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_48%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.68)_48%,rgba(238,247,250,0)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-[28%] -top-[24%] h-[58%] w-[58%] bg-aqua/10 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-[28%] -left-[30%] h-[60%] w-[62%] bg-lilac/10 blur-[130px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="w-28"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.36, ease: easeOut }}
        >
          <BrandLogo className="max-w-full" />
        </motion.div>

        <motion.p
          className="mt-4.5 text-sm font-medium tracking-[-0.01em] text-navy"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.32,
            delay: reduceMotion ? 0 : 0.07,
            ease: easeOut,
          }}
        >
          {label}
        </motion.p>

        <motion.div
          className="mt-3.5 flex items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.28,
            delay: reduceMotion ? 0 : 0.15,
            ease: easeOut,
          }}
          aria-hidden="true"
        >
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="block size-1 rounded-full bg-brand"
              animate={
                reduceMotion
                  ? { opacity: 0.48 }
                  : { y: [0, -2.5, 0], opacity: [0.28, 0.72, 0.28] }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 1.2,
                      delay: dot * 0.16,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.32, 0.64],
                    }
              }
            />
          ))}
        </motion.div>
      </div>
    </motion.main>
  );
}
