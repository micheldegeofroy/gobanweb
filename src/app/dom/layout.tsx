import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Domiio Go - Branded Go Game Experience',
  description: 'Play Domiio Go - a stylish branded Go experience with custom aesthetics. Modern design meets ancient strategy. Free, no login required.',
  keywords: [
    'Domiio Go', 'branded Go', 'stylish Go game',
    'modern Go', 'designer Go', 'Go with style',
    'custom Go board', 'Go game design'
  ],
  openGraph: {
    title: 'Domiio Go - Branded Go Experience | Goban Web',
    description: 'A stylish branded Go experience. Modern design meets ancient strategy.',
    url: 'https://gobanweb.vercel.app/dom',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Domiio Go - Stylish Go Game',
    description: 'Go with style. Modern aesthetics, classic gameplay.',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/dom',
  },
};

export default function DomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
