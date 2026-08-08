import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BeSeen — Outcome-Based Attention',
    short_name: 'BeSeen',
    description:
      'Pay creators for replies with outcome-based attention. Guaranteed, or refunded.',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef7fa',
    theme_color: '#1045f5',
    orientation: 'any',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
