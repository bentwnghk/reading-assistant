import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Image Viewer",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  minimumScale: 0.5,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function ImageViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
