"use client";
import dynamic from "next/dynamic";
import { Suspense, useState, useLayoutEffect, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSettingStore } from "@/store/setting";
import { useHistoryStore } from "@/store/history";
import { setHistorySyncFn, useReadingStore, isRestoreComplete } from "@/store/reading";
import { isShareCheckComplete } from "@/store/sharing";
import useAutoSave from "@/hooks/useAutoSave";
import { useVocabularySync } from "@/hooks/useVocabularySync";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { LandingPage } from "@/components/Auth/LandingPage";
import { Footer } from "@/components/Internal/Footer";

const Header = dynamic(() => import("@/components/Internal/Header"));
const SettingsBanner = dynamic(() => import("@/components/Internal/SettingsBanner"));
const StudentInfo = dynamic(() => import("@/components/ReadingAssistant/StudentInfo"));
const ImageUpload = dynamic(() => import("@/components/ReadingAssistant/ImageUpload"));
const PreReading = dynamic(() => import("@/components/ReadingAssistant/PreReading"));
const WorkflowProgress = dynamic(() => import("@/components/ReadingAssistant/WorkflowProgress"));
const Summary = dynamic(() => import("@/components/ReadingAssistant/Summary"));
const AdaptedText = dynamic(() => import("@/components/ReadingAssistant/AdaptedText"));
const MindMap = dynamic(() => import("@/components/ReadingAssistant/MindMap"));
const Visualization = dynamic(() => import("@/components/ReadingAssistant/Visualization"));
const ReadingTest = dynamic(() => import("@/components/ReadingAssistant/ReadingTest"));
const Glossary = dynamic(() => import("@/components/ReadingAssistant/Glossary"));
const Collocations = dynamic(() => import("@/components/ReadingAssistant/Collocations"));
const Grammar = dynamic(() => import("@/components/ReadingAssistant/Grammar"));
const TocFab = dynamic(() => import("@/components/ReadingAssistant/TocFab"));
const TutorChatFab = dynamic(() => import("@/components/ReadingAssistant/TutorChatFab"));
const LearningRecommendationDialog = dynamic(() => import("@/components/ReadingAssistant/LearningRecommendationDialog"));

function HomeContent() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();
  const { extractedText, docTitle, restore } = useReadingStore();
  const { generateTitle } = useReadingAssistant();
  const searchParams = useSearchParams();
  const router = useRouter();

  useAutoSave();
  useVocabularySync();

  const [restoreReady, setRestoreReady] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (isRestoreComplete() && isShareCheckComplete()) {
      setRestoreReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (isRestoreComplete() && isShareCheckComplete()) {
        setRestoreReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  useLayoutEffect(() => {
    setHistorySyncFn((readingStore) => {
      useHistoryStore.getState().syncToHistory(readingStore);
    });
  }, []);

  // Deep-link support: /?session=<id> loads a specific session into the reading
  // store on mount. Used by the Assignments feature's "Start / Continue" CTA so
  // students can jump straight into their assigned reading session.
  useEffect(() => {
    if (!restoreReady) return;
    const sessionId = searchParams.get("session");
    if (!sessionId) return;
    const current = useReadingStore.getState();
    // If the requested session is already loaded, just clean up the URL.
    if (current.id === sessionId) {
      router.replace("/");
      return;
    }
    // loadFull fetches the complete session (including originalImages and
    // visualizationImage) from the API if not already hydrated in memory. This
    // correctly serves assignment snapshot images via getReadingSession.
    useHistoryStore.getState().loadFull(sessionId).then((data) => {
      if (data) {
        restore(data).then(() => {
          router.replace("/");
        });
      } else {
        router.replace("/");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreReady, searchParams]);

  // Recover title generation after an iOS PWA page refresh that interrupted the
  // extraction flow. If the store has extracted text but no title (because the
  // async chain in ImageUpload was killed before generateTitle() ran), re-run it.
  useEffect(() => {
    if (extractedText && !docTitle) {
      generateTitle();
    }
    // Run only once on mount — intentionally omitting generateTitle from deps
    // to avoid re-running when the function reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const settingStore = useSettingStore.getState();
    setTheme(settingStore.theme);
  }, [theme, setTheme]);

  // Show a full-screen loading overlay while the session is being resolved
  // or while the user's data is being restored after sign-in. This prevents
  // a flash of the app UI before the "Welcome back!" dialog appears.
  if (status === "loading" || (status === "authenticated" && !restoreReady)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-lg text-muted-foreground">{t("header.auth.loading")}</p>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return (
    <>
      <Header />
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
        <SettingsBanner />
      <main>
        <section id="section-student-info">
          <StudentInfo />
        </section>
        <section id="section-upload">
          <ImageUpload />
        </section>
        <section id="section-pre-reading">
          <PreReading />
        </section>
        <WorkflowProgress />
        <section id="section-summary">
          <Summary />
        </section>
        <section id="section-mindmap">
          <MindMap />
        </section>
        <section id="section-visualization">
          <Visualization />
        </section>
        <section id="section-adapted">
          <AdaptedText />
        </section>
        <section id="section-glossary">
          <Glossary />
        </section>
        <section id="section-collocations">
          <Collocations />
        </section>
        <section id="section-test">
          <ReadingTest />
        </section>
        <section id="section-grammar">
          <Grammar />
        </section>
      </main>
      <TocFab />
      <TutorChatFab />
      <LearningRecommendationDialog />
      <Footer />
    </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
