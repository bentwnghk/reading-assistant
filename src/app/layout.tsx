import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ThemeProvider from "@/components/Provider/Theme";
import I18Provider from "@/components/Provider/I18n";
import { AuthProvider } from "@/components/Provider/AuthProvider";
import { AchievementUnlockedDialog } from "@/components/Leaderboard/AchievementUnlockedDialog";
import Debugger from "@/components/Internal/Debugger";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const HEAD_SCRIPTS = process.env.HEAD_SCRIPTS as string;
const APP_NAME = "Mr.🆖 ProReader";
const APP_DEFAULT_TITLE = "Mr.🆖 ProReader";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION =
  "Transform any English reading material into an interactive learning experience! 🚀 With AI-powered tools, personalized content, and gamified learning, mastering English reading has never been this exciting!";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    startupImage: [
      { url: "/apple-splash-2048x2732.png", width: 2048, height: 2732 },
      { url: "/apple-splash-1668x2388.png", width: 1668, height: 2388 },
      { url: "/apple-splash-1640x2360.png", width: 1640, height: 2360 },
      { url: "/apple-splash-1536x2048.png", width: 1536, height: 2048 },
      { url: "/apple-splash-1290x2796.png", width: 1290, height: 2796 },
      { url: "/apple-splash-1278x2778.png", width: 1278, height: 2778 },
      { url: "/apple-splash-1242x2688.png", width: 1242, height: 2688 },
      { url: "/apple-splash-1179x2556.png", width: 1179, height: 2556 },
      { url: "/apple-splash-1170x2532.png", width: 1170, height: 2532 },
      { url: "/apple-splash-1125x2436.png", width: 1125, height: 2436 },
      { url: "/apple-splash-1080x1920.png", width: 1080, height: 1920 },
      { url: "/apple-splash-828x1792.png", width: 828, height: 1792 },
      { url: "/apple-splash-750x1334.png", width: 750, height: 1334 },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  minimumScale: 1.0,
  maximumScale: 1.0,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="auto" suppressHydrationWarning>
      <head>
        {HEAD_SCRIPTS ? <Script id="headscript">{HEAD_SCRIPTS}</Script> : null}
        <Debugger />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <I18Provider>
              {children}
              <AchievementUnlockedDialog />
            </I18Provider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster richColors toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
