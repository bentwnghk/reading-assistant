import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Mr.🆖 ProReader — how we collect, use, and protect your information when using the AI-powered English reading assistance service.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy - Mr.🆖 ProReader",
    description:
      "How Mr.🆖 ProReader collects, uses, and protects your information.",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
