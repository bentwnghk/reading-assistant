import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn from your mistakes · Language Check",
  description:
    "Personalised lessons, practice exercises and quizzes built from the errors in your essay.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LanguageCheckLearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
