import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Mr.🆖 ProReader — the rules and agreements that govern your use of the AI-powered English reading assistance service.",
  alternates: {
    canonical: "/terms-of-service",
  },
  openGraph: {
    title: "Terms of Service - Mr.🆖 ProReader",
    description:
      "The rules and agreements that govern your use of Mr.🆖 ProReader.",
  },
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
