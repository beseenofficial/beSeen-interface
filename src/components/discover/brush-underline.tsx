'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function BrushUnderline() {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      className="pointer-events-none absolute -bottom-2 left-[-3%] h-3 w-[108%] overflow-visible"
      viewBox="0 0 160 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        d="M4 9.4C34 5.2 66 5.8 91 6.2C116 6.5 138 5.3 156 3.8"
        stroke="#64ddea"
        strokeWidth="7"
        strokeLinecap="round"
        initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.45 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d="M7 11C39 8.2 78 8.3 111 7.4C129 7 144 6.1 154 5.1"
        stroke="#ecf653"
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={reduceMotion ? { pathLength: 1, opacity: 0.9 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: reduceMotion ? 0 : 0.68, delay: reduceMotion ? 0 : 0.43, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
