import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const title = `@${username}`;
  const description = `View @${username}'s verified public profile, broadcasts, and creator presence on BeSeen.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${encodeURIComponent(username)}`,
    },
    openGraph: {
      type: 'profile',
      url: `/${encodeURIComponent(username)}`,
      title: `${title} on BeSeen`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} on BeSeen`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function PublicProfileLayout({ children }: Props) {
  return children;
}
