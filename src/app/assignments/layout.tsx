import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Assignments",
  description: "Reading assignments shared by your teacher.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AssignmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
