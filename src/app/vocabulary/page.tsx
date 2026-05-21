"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSettingStore } from "@/store/setting";
import { useTheme } from "next-themes";
import { useLayoutEffect } from "react";

const Header = dynamic(() => import("@/components/Internal/Header"));
const VocabularyContainer = dynamic(
  () => import("@/components/Vocabulary/VocabularyContainer"),
  { ssr: false }
);

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
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
        <VocabularyContainer />
      </div>
    </div>
  );
}
