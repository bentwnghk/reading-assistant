import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/Provider/Theme";
import I18Provider from "@/components/Provider/I18n";
import { AuthProvider } from "@/components/Provider/AuthProvider";
import { AchievementUnlockedDialog } from "@/components/Leaderboard/AchievementUnlockedDialog";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Debugger from "@/components/Internal/Debugger";
import { Toaster } from "@/components/ui/sonner";
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_NAME,
  APP_TITLE_TEMPLATE,
  SITE_URL,
} from "@/constants/site";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const HEAD_SCRIPTS = process.env.HEAD_SCRIPTS as string;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  keywords: APP_KEYWORDS,
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png", sizes: "128x128" },
    ],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", sizes: "128x128" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en",
    siteName: APP_NAME,
    url: SITE_URL,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  minimumScale: 1.0,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
      <body
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <I18Provider>
              <ServiceWorkerRegistrar />
              <PWAInstallPrompt />
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
