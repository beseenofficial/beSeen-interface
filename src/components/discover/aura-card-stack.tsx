'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { DiscoverUser } from '@/types';
import { DiscoverCard } from './discover-card';

const AURA_CARDS = [
  {
    id: 'aura-maya',
    username: 'maya',
    avatar: '/images/avatars/maya.webp',
    bio: 'Building thoughtful spaces for creative people.',
    followerCount: 482,
    followingCount: 0,
    verification: { isVerified: false, grantedAt: null, expiresAt: null },
  },
  {
    id: 'aura-kiwi',
    username: 'kiwi',
    avatar: '/images/avatars/kiwi.webp',
    bio: 'Sharing ideas on design, culture, and community.',
    followerCount: 76,
    followingCount: 0,
    verification: { isVerified: false, grantedAt: null, expiresAt: null },
  },
  {
    id: 'aura-nova',
    username: 'nova',
    avatar: '/images/avatars/nova.webp',
    bio: 'Connecting curious minds across the open network.',
    followerCount: 2080,
    followingCount: 0,
    verification: { isVerified: false, grantedAt: null, expiresAt: null },
  },
] satisfies readonly DiscoverUser[];

const STACK_POSITIONS = [
  { x: 0, y: 0, rotate: -1.5, scale: 1, opacity: 1 },
  { x: 13, y: 18, rotate: 1.2, scale: 0.955, opacity: 0.82 },
  { x: 26, y: 36, rotate: 3.6, scale: 0.91, opacity: 0.58 },
] as const;

export function AuraCardStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(document.visibilityState === 'visible');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (reduceMotion || !isVisible || !isDocumentVisible) return;

    const rotateStack = () => setOrder(([first, ...rest]) => [...rest, first]);
    const interval = window.setInterval(rotateStack, 2600);
    return () => window.clearInterval(interval);
  }, [isDocumentVisible, isVisible, reduceMotion]);

  return (
    <div ref={containerRef} className="relative mx-auto h-[300px] w-full max-w-[330px]" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-52 w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/8 blur-3xl" />
      {AURA_CARDS.map((card, cardIndex) => {
        const stackIndex = order.indexOf(cardIndex);
        const position = STACK_POSITIONS[stackIndex];

        return (
          <motion.div
            key={card.id}
            className="absolute inset-x-0 top-4 max-sm:inset-x-1"
            animate={reduceMotion ? STACK_POSITIONS[cardIndex] : position}
            initial={false}
            transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            style={{ zIndex: AURA_CARDS.length - stackIndex }}
          >
            <DiscoverCard user={card} preview />
          </motion.div>
        );
      })}
    </div>
  );
}
