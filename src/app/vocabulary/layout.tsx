import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Vocabulary",
  description: "Personal vocabulary review and spaced-repetition practice.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VocabularyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
