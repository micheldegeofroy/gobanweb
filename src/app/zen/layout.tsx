import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zen Go - 3 Player Go Game with Shared Stones',
  description: 'Play Zen Go with 3 players sharing one pot of alternating black and white stones. A meditative Go variant where every move matters. Free, no login required.',
  keywords: [
    '3 player Go', 'three player Go', 'Go game 3 players',
    'Zen Go', 'Go variant', 'shared stones Go',
    'meditative Go', 'strategic Go', 'alternating stones'
  ],
  openGraph: {
    title: 'Zen Go - 3 Player Go Game | Goban Web',
    description: 'Play Go with 3 players sharing alternating stones. Its all about the moves.',
    url: 'https://gobanweb.vercel.app/zen',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zen Go - 3 Player Go Variant',
    description: '3 players, shared stones, pure strategy. Its all about the moves.',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/zen',
  },
};

export default function ZenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
