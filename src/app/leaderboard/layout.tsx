import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Reading practice leaderboard and achievements.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
