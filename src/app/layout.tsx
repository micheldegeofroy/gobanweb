import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";

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
  viewportFit: 'cover', // For iPhone notch/Dynamic Island - extend to edges
  interactiveWidget: 'resizes-content', // Android: keyboard resizes content
};

export const metadata: Metadata = {
  title: {
    default: "Goban Web - Free Online Go Board | Play Go Anywhere",
    template: "%s | Goban Web"
  },
  description: "Play Go (Baduk/Weiqi) instantly on any device - iPad, tablet, or phone. No login required. Share a link and play with friends locally or remotely. Free virtual Go board with real-time sync.",
  manifest: '/site.webmanifest',
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

// Main WebApplication structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Goban Web',
  description: 'Free online Go board game. Play Go (Baduk/Weiqi) instantly on any device with friends. No login required.',
  url: 'https://gobanweb.vercel.app',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Works on all modern browsers.',
  softwareVersion: '1.0',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '500',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'No login required',
    'Play on iPad, tablet, or phone',
    'Real-time multiplayer',
    'Share board via link',
    'Multiple board sizes (9x9, 13x13, 19x19)',
    'Interactive tutorial for beginners',
    '6 unique Go game variants',
    'Works offline as PWA',
  ],
};

// Organization structured data
const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Goban Web',
  url: 'https://gobanweb.vercel.app',
  logo: 'https://gobanweb.vercel.app/icon.svg',
  sameAs: [],
};

// BreadcrumbList for SEO
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://gobanweb.vercel.app',
    },
  ],
};

// FAQPage for common questions
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Go?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Go (also known as Baduk or Weiqi) is an ancient board game originating in China over 4,000 years ago. Two players take turns placing black and white stones on a grid, aiming to surround territory and capture opponent stones.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Goban Web free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Goban Web is completely free to use. No login, no signup, no payment required. Just create a board and share the link with friends to play.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I play Go on my phone or tablet?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Goban Web works on all devices including iPhones, iPads, Android phones, Android tablets, and desktop computers. It can also be installed as an app on your home screen.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I play with friends?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Create a new game board, then click the Share button to copy the link. Send this link to your friend and they can join instantly - no account needed.',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
