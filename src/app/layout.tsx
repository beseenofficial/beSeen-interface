import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { Providers } from '@/providers';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://beseen.fi';
const title = 'BeSeen — Outcome-Based Attention';
const description =
  'Pay creators for replies with outcome-based attention. Guaranteed, or refunded.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | BeSeen',
  },
  description,
  applicationName: 'BeSeen',
  authors: [{ name: 'BeSeen', url: siteUrl }],
  creator: 'BeSeen',
  publisher: 'BeSeen',
  category: 'technology',
  keywords: [
    'BeSeen',
    'creator economy',
    'outcome-based attention',
    'creator replies',
    'encrypted broadcasts',
    'Stellar',
    'Blux',
  ],
  referrer: 'origin-when-cross-origin',
  alternates: {
    canonical: '/',
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'BeSeen',
    title,
    description,
    images: [
      {
        url: '/brand/beSeenLogoType.png',
        width: 11352,
        height: 3144,
        alt: 'BeSeen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/brand/beSeenLogoType.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'BeSeen',
    statusBarStyle: 'default',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#071648' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${outfit.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
