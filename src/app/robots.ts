import type { MetadataRoute } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://beseen.fi';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/onboarding/', '/login'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
