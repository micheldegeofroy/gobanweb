import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Go Bang - War Themed Go Game with Mines and Drones',
  description: 'Play Go Bang - a war-themed Go variant with hidden mines, drone strikes, and explosions! Russia vs Ukraine themed stones. Strategic warfare on a Go board. Free, no login required.',
  keywords: [
    'Go Bang', 'war Go game', 'Go with explosions',
    'mines Go game', 'drone strike Go', 'tactical Go',
    'military Go', 'strategy war game', 'Go variant'
  ],
  openGraph: {
    title: 'Go Bang - War Themed Go Game | Goban Web',
    description: 'Go meets warfare. Hidden mines, drone strikes, and strategic explosions. Just war.',
    url: 'https://gobanweb.vercel.app/bang',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Go Bang - Tactical War Go Game',
    description: 'Go with mines, drones, and explosions. Just war.',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/bang',
  },
};

export default function BangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
