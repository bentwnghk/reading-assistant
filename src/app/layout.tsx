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
const APP_NAME = "Mr.🆖 ProReader";
const APP_DEFAULT_TITLE = "Mr.🆖 ProReader";
const APP_TITLE_TEMPLATE = "%s - Mr.🆖 ProReader";
const APP_DESCRIPTION =
  "Transform any English reading material into an interactive learning experience! 🚀 With AI-powered tools, personalized content, and gamified learning, mastering English reading has never been this exciting!";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  icons: {
    icon: {
      type: "image/svg+xml",
      url: "./logo.svg",
    },
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
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
