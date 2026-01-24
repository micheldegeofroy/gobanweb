import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wilde Go - Multiplayer Go for 2-8 Players',
  description: 'Play Wilde Go with 2-8 players! Colorful stones, custom board sizes, and endless possibilities. Everything is possible in this creative Go variant. Free, no login required.',
  keywords: [
    'multiplayer Go', '8 player Go', 'Go game multiplayer',
    'colorful Go', 'Go variant', 'party Go game',
    'group Go', 'custom Go', 'Go with friends', 'Wilde Go'
  ],
  openGraph: {
    title: 'Wilde Go - 2-8 Player Multiplayer Go | Goban Web',
    description: 'Play Go with up to 8 players! Colorful stones and custom boards. Everything is possible.',
    url: 'https://gobanweb.vercel.app/wilde',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wilde Go - Multiplayer Go Game',
    description: 'Play Go with 2-8 players. Colorful, creative, and free!',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/wilde',
  },
};

export default function WildeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
