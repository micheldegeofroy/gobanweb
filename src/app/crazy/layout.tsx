import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crazy Go - 4 Player Go Game Variant',
  description: 'Play Crazy Go with 4 players! Black, White, Black-Cross, and White-Cross stones compete in this wild Go variant. Not for normal people. Free, no login required.',
  keywords: [
    '4 player Go', 'four player Go', 'Go game 4 players',
    'Crazy Go', 'Go variant', 'cross stones Go',
    'multiplayer board game', 'Go with 4 people', 'team Go'
  ],
  openGraph: {
    title: 'Crazy Go - 4 Player Go Game | Goban Web',
    description: 'Play Go with 4 players! Four stone types, one board, endless chaos. Not for normal people.',
    url: 'https://gobanweb.vercel.app/crazy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crazy Go - 4 Player Go Variant',
    description: '4 players, 4 stone types, 1 board. Chaos guaranteed!',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/crazy',
  },
};

export default function CrazyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
