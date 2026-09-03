'use client';

import { useEffect, useMemo, useState } from 'react';

const FALLBACK_PALETTES = [
  ['#e76f51', '#c77dff'], ['#1045f5', '#64ddea'], ['#7b61ff', '#ff8fab'],
  ['#0f766e', '#84cc16'], ['#f97316', '#f9a8d4'], ['#2563eb', '#a78bfa'],
] as const;

function fallbackPalette(seed: string): readonly [string, string] {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return FALLBACK_PALETTES[(hash >>> 0) % FALLBACK_PALETTES.length];
}

function toHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function extractPalette(image: HTMLImageElement): readonly [string, string] {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, 48, 48);

  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();
  const pixels = context.getImageData(0, 0, 48, 48).data;
  for (let index = 0; index < pixels.length; index += 16) {
    const [red, green, blue, alpha] = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    const brightness = (red + green + blue) / 3;
    if (alpha < 180 || brightness < 24 || brightness > 240) continue;
    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    buckets.set(key, bucket);
  }

  const colors = Array.from(buckets.values())
    .sort((first, second) => second.count - first.count)
    .map((bucket) => [
      Math.round(bucket.red / bucket.count),
      Math.round(bucket.green / bucket.count),
      Math.round(bucket.blue / bucket.count),
    ]);
  if (colors.length === 0) throw new Error('No usable colors found');
  const primary = colors[0];
  const secondary = colors.find((color) => Math.hypot(primary[0] - color[0], primary[1] - color[1], primary[2] - color[2]) > 72) ?? colors[1] ?? primary;
  return [toHex(primary[0], primary[1], primary[2]), toHex(secondary[0], secondary[1], secondary[2])];
}

export function useAvatarPalette(avatar: string | null, seed: string): readonly [string, string] {
  const fallback = useMemo(() => fallbackPalette(seed), [seed]);
  const [palette, setPalette] = useState<readonly [string, string]>(fallback);

  useEffect(() => {
    setPalette(fallback);
    if (!avatar) return;
    let active = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      if (!active) return;
      try { setPalette(extractPalette(image)); } catch { setPalette(fallback); }
    };
    image.onerror = () => { if (active) setPalette(fallback); };
    image.src = avatar;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [avatar, fallback]);

  return palette;
}
