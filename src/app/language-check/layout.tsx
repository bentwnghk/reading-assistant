import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Language Check",
  description:
    "Digitise handwritten or scanned essays and get inline language corrections with grammar notes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LanguageCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
