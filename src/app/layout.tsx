import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Goban Web - Free Online Go Board | Play Go Anywhere",
    template: "%s | Goban Web"
  },
  description: "Play Go (Baduk/Weiqi) instantly on any device - iPad, tablet, or phone. No login required. Share a link and play with friends locally or remotely. Free virtual Go board with real-time sync.",
  keywords: [
    "Go game", "Baduk", "Weiqi", "online Go", "play Go online", "Go board",
    "virtual Go board", "free Go game", "Go iPad", "Go tablet", "Go mobile",
    "play Go with friends", "two player Go", "Go no login", "simple Go game",
    "Go board app", "Goban", "Go strategy game", "abstract board game",
    "play Go remotely", "share Go board", "real-time Go", "Go for beginners"
  ],
  authors: [{ name: "Goban Web" }],
  creator: "Goban Web",
  publisher: "Goban Web",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Goban Web',
    title: 'Goban Web - Free Online Go Board | Play Go Anywhere',
    description: 'Play Go instantly on any device. No login required. Share a link and play with friends locally or remotely. Free virtual Go board.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goban Web - Free Online Go Board',
    description: 'Play Go instantly on any device. No login, no signup. Just share a link and play!',
  },
  alternates: {
    canonical: 'https://gobanweb.vercel.app',
  },
  category: 'Games',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Goban Web',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'google-site-verification': '', // Add your Google Search Console verification code
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Goban Web',
  description: 'Free online Go board game. Play Go (Baduk/Weiqi) instantly on any device with friends. No login required.',
  url: 'https://gobanweb.vercel.app',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '100',
  },
  featureList: [
    'No login required',
    'Play on iPad, tablet, or phone',
    'Real-time multiplayer',
    'Share board via link',
    'Multiple board sizes (9x9, 13x13, 19x19)',
    'Interactive tutorial for beginners',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
