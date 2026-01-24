import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Online Go - Play Classic Go (Baduk/Weiqi) Free',
  description: 'Play the classic game of Go online for free. 2 players, traditional rules, no login required. Choose 9x9, 13x13, or 19x19 board. Share a link and play with friends on any device.',
  keywords: [
    'Go game online', 'play Go free', 'Baduk online', 'Weiqi game',
    'Go board game', '19x19 Go', '13x13 Go', '9x9 Go',
    'two player Go', 'classic Go', 'traditional Go', 'play Go with friends'
  ],
  openGraph: {
    title: 'Online Go - Play Classic Go Free | Goban Web',
    description: 'Play the classic game of Go online. 2 players, traditional rules, no signup needed.',
    url: 'https://gobanweb.vercel.app/classic',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Go - Classic Go Game Free',
    description: 'Play Go online with friends. No login, just share a link and play!',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app/classic',
  },
};

export default function ClassicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
