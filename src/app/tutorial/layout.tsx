import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Go - Free Interactive Tutorial for Beginners",
  description: "Learn how to play Go (Baduk/Weiqi) with our free interactive tutorial. Master the basics: placing stones, capturing, territory, and winning. Perfect for beginners.",
  keywords: [
    "learn Go", "Go tutorial", "how to play Go", "Go rules", "Baduk tutorial",
    "Weiqi rules", "Go for beginners", "Go game rules", "free Go tutorial",
    "interactive Go lessons", "Go game guide", "Go basics", "capture stones Go"
  ],
  openGraph: {
    title: "Learn Go - Free Interactive Tutorial | Goban Web",
    description: "Master the ancient game of Go with our free interactive tutorial. Perfect for beginners.",
    url: "https://gobanweb.vercel.app/tutorial",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Go - Free Interactive Tutorial",
    description: "Master the ancient game of Go with our free beginner-friendly tutorial.",
  },
  alternates: {
    canonical: "https://gobanweb.vercel.app/tutorial",
  },
};

export default function TutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
