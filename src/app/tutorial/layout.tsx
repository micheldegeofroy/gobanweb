import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Go - Free Interactive Tutorial for Beginners",
  description: "Learn how to play Go (Baduk/Weiqi) with our free interactive tutorial. Master the rules of this ancient strategy game in just 5 minutes.",
  keywords: [
    "learn Go", "Go tutorial", "how to play Go", "Go rules", "Baduk tutorial",
    "Weiqi rules", "Go for beginners", "Go game rules", "free Go tutorial"
  ],
  openGraph: {
    title: "Learn Go - Free Interactive Tutorial",
    description: "Master the ancient game of Go in 5 minutes with our interactive tutorial.",
  },
};

export default function TutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
