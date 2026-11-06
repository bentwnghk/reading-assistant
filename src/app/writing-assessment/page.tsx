"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import { useSettingStore } from "@/store/setting";
import { useTheme } from "next-themes";

const Header = dynamic(() => import("@/components/Internal/Header"));
const Footer = dynamic(() =>
  import("@/components/Internal/Footer").then((m) => ({ default: m.Footer }))
);
const LanguageCheckContainer = dynamic(
  () => import("@/components/LanguageCheck/LanguageCheckContainer"),
  { ssr: false }
);

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();

  useLayoutEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Wider than other pages: scan + transcript / essay + cards side by side. */}
      <div className="max-w-screen-2xl mx-auto px-4 py-4">
        <Suspense fallback={<Spinner />}>
          <LanguageCheckContainer />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
