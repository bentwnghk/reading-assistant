"use client";
import dynamic from "next/dynamic";
import { Suspense, useState, useLayoutEffect, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Footer } from "@/components/Internal/Footer";
import { useSettingStore } from "@/store/setting";
import { useHistoryStore } from "@/store/history";
import { setHistorySyncFn, useReadingStore, isRestoreComplete } from "@/store/reading";
import { isShareCheckComplete } from "@/store/sharing";
import useAutoSave from "@/hooks/useAutoSave";
import { useVocabularySync } from "@/hooks/useVocabularySync";
import useReadingAssistant from "@/hooks/useReadingAssistant";

// NOTE (SEO): the landing page is rendered while the auth session is still
// "loading" — that is exactly the state Next.js static prerendering runs in,
// so crawlers and first-time visitors receive the full landing content in the
// initial HTML instead of a blank client-rendered shell. Signed-in users see
// it only for the instant /api/auth/session takes to resolve, then the
// authenticated app below takes over.
const loadLandingPage = () => import("@/components/Auth/LandingPage").then((m) => m.LandingPage);
const loadHeader = () => import("@/components/Internal/Header");
const loadSettingsBanner = () => import("@/components/Internal/SettingsBanner");
const loadImageUpload = () => import("@/components/ReadingAssistant/ImageUpload");
const loadPreReading = () => import("@/components/ReadingAssistant/PreReading");
const loadWorkflowProgress = () => import("@/components/ReadingAssistant/WorkflowProgress");
const loadSummary = () => import("@/components/ReadingAssistant/Summary");
const loadAdaptedText = () => import("@/components/ReadingAssistant/AdaptedText");
const loadMindMap = () => import("@/components/ReadingAssistant/MindMap");
const loadVisualization = () => import("@/components/ReadingAssistant/Visualization");
const loadReadingTest = () => import("@/components/ReadingAssistant/ReadingTest");
const loadGlossary = () => import("@/components/ReadingAssistant/Glossary");
const loadCollocations = () => import("@/components/ReadingAssistant/Collocations");
const loadGrammar = () => import("@/components/ReadingAssistant/Grammar");
const loadTutorChatFab = () => import("@/components/ReadingAssistant/TutorChatFab");
const loadReadAlongIndicator = () => import("@/components/ReadingAssistant/ReadAlongIndicator");
const loadLearningRecommendationDialog = () => import("@/components/ReadingAssistant/LearningRecommendationDialog");
const loadOnboardingDialog = () => import("@/components/Onboarding/OnboardingDialog");

const LandingPage = dynamic(loadLandingPage);
const Header = dynamic(loadHeader);
const SettingsBanner = dynamic(loadSettingsBanner);
const ImageUpload = dynamic(loadImageUpload);
const PreReading = dynamic(loadPreReading);
const WorkflowProgress = dynamic(loadWorkflowProgress);
const Summary = dynamic(loadSummary);
const AdaptedText = dynamic(loadAdaptedText);
const MindMap = dynamic(loadMindMap);
const Visualization = dynamic(loadVisualization);
const ReadingTest = dynamic(loadReadingTest);
const Glossary = dynamic(loadGlossary);
const Collocations = dynamic(loadCollocations);
const Grammar = dynamic(loadGrammar);
const TutorChatFab = dynamic(loadTutorChatFab);
const ReadAlongIndicator = dynamic(loadReadAlongIndicator);
const LearningRecommendationDialog = dynamic(loadLearningRecommendationDialog);
const OnboardingDialog = dynamic(loadOnboardingDialog);

// Every section chunk the authenticated home page is guaranteed to render.
// While the sign-in data gate shows its spinner, the early return below means
// none of these next/dynamic chunks would start downloading until ALL data
// requests settle — serializing chunk downloads behind the network waterfall.
// Preloading them here lets JS fetch and data fetch run in parallel; the
// import() promise is cached by the bundler, so first render resolves instantly.
const SECTION_LOADERS = [
  loadHeader,
  loadSettingsBanner,
  loadImageUpload,
  loadPreReading,
  loadWorkflowProgress,
  loadSummary,
  loadAdaptedText,
  loadMindMap,
  loadVisualization,
  loadReadingTest,
  loadGlossary,
  loadCollocations,
  loadGrammar,
  loadTutorChatFab,
  loadReadAlongIndicator,
  loadLearningRecommendationDialog,
  loadOnboardingDialog,
];

// iOS Safari can leave the auth/session network fetch pending indefinitely after
// the browser killed and restored a tab, keeping the page stuck. Recover
// automatically: after the watchdog window, attempt one silent reload (tracked
// in sessionStorage so it cannot loop); if still stuck, surface a tappable
// reload button — the user gesture is what unblocks iOS' suspended network on
// the restored tab. 12s is past the service worker's own 10s NetworkOnly
// timeout on /api/auth/*, so it only fires on a genuinely stuck fetch.
const LOAD_WATCHDOG_KEY = "__next_load_reloaded";
const LOAD_WATCHDOG_MS = 12_000;

function LoadingScreen({ stuck, onReload }: { stuck: boolean; onReload: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-lg text-muted-foreground">{t("header.auth.loading")}</p>
      {stuck ? (
        <div className="mt-2 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{t("header.auth.stuck")}</p>
          <Button variant="outline" onClick={onReload}>
            <RotateCcw className="h-4 w-4" />
            {t("header.auth.reload")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// Deep-link handling for authenticated users: /?session=<id> restores a
// specific session (Assignments "Start / Continue" CTA) and /?goto=<section-id>
// scrolls to a section after cross-page navigation (SectionNavSheet).
// useSearchParams deopts everything up to the nearest Suspense boundary to
// client-side rendering during static prerendering, so these effects live in
// their own <Suspense fallback={null}> boundary — that keeps the landing
// markup above it in the prerendered HTML. The component only mounts once the
// user is authenticated AND the session restore completed (see HomeShell), so
// the old restoreReady/session gates are guaranteed by the mount point.
function DeepLinkEffects() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // /?session=<id> loads a specific session into the reading store on mount.
  // loadFull fetches the complete session (including originalImages and
  // visualizationImage) from the API if not already hydrated in memory. This
  // correctly serves assignment snapshot images via getReadingSession.
  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId) return;
    const current = useReadingStore.getState();
    // If the requested session is already loaded, just clean up the URL.
    if (current.id === sessionId) {
      router.replace("/");
      return;
    }
    useHistoryStore.getState().loadFull(sessionId).then((data) => {
      if (data) {
        useReadingStore.getState().restore(data).then(() => {
          router.replace("/");
        });
      } else {
        router.replace("/");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // NOTE: router.replace MUST pass { scroll: false } — the default scroll reset
  // scrolls to top after the URL cleanup, which on iOS (where scrollIntoView is
  // effectively instant) lands AFTER the section is reached and yanks the page
  // back to the top.
  useEffect(() => {
    const goto = searchParams.get("goto");
    if (!goto) return;
    const element = document.getElementById(goto);
    if (element) {
      scrollAndSettle(element);
    }
    router.replace("/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

// Cross-page goto jumps scroll as soon as the store is restored, but the page
// keeps assembling afterwards: next/dynamic chunks, lazy-loaded media and
// restored sections above the target change the document height, shifting the
// target AFTER the initial scrollIntoView (landing "an inch" off). Keep
// re-aligning to the target while the layout settles, then stop.
// Deliberately fire-and-forget (not tied to the effect's cleanup): the goto
// effect re-runs right away when router.replace strips the ?goto param, which
// would tear the settle logic down before it does its work.
function scrollAndSettle(element: HTMLElement) {
  element.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof ResizeObserver === "undefined") return;
  const settleMs = 2000;
  const animationMs = 700; // let the initial smooth scroll finish first
  const start = Date.now();
  const align = () => element.scrollIntoView({ behavior: "auto", block: "start" });
  const observer = new ResizeObserver(() => {
    const elapsed = Date.now() - start;
    if (elapsed < animationMs) return;
    if (elapsed >= settleMs) {
      observer.disconnect();
      return;
    }
    align();
  });
  observer.observe(document.body);
  setTimeout(() => {
    observer.disconnect();
    align();
  }, settleMs);
}

export default function HomeShell() {
  const { status } = useSession();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();
  const { extractedText, docTitle } = useReadingStore();
  const { generateTitle } = useReadingAssistant();

  useAutoSave();
  useVocabularySync();

  const [restoreReady, setRestoreReady] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);
  const isLoading = status === "loading" || (status === "authenticated" && !restoreReady);

  const handleStuckReload = () => {
    try {
      sessionStorage.removeItem(LOAD_WATCHDOG_KEY);
    } catch {}
    window.location.reload();
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (isRestoreComplete() && isShareCheckComplete()) return;
    // Fire-and-forget: warm the dynamic section chunks while the sign-in data
    // gate shows its spinner (see SECTION_LOADERS comment above).
    for (const load of SECTION_LOADERS) {
      load().catch(() => {});
    }
  }, [status]);

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

  useEffect(() => {
    if (!isLoading) {
      setStuckLoading(false);
      try {
        sessionStorage.removeItem(LOAD_WATCHDOG_KEY);
      } catch {}
      return;
    }
    const timer = setTimeout(() => {
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(LOAD_WATCHDOG_KEY) === "1";
      } catch {}
      if (!alreadyTried) {
        try {
          sessionStorage.setItem(LOAD_WATCHDOG_KEY, "1");
        } catch {}
        window.location.reload();
        return;
      }
      setStuckLoading(true);
    }, LOAD_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useLayoutEffect(() => {
    setHistorySyncFn((readingStore) => {
      useHistoryStore.getState().syncToHistory(readingStore);
    });
  }, []);

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

  // While the session request is in flight, render the landing page: this is
  // the state the static prerender runs in, so crawlers get the full landing
  // content in the initial HTML, and signed-in users get an instant (branded)
  // first paint instead of a blank screen. If the session fetch hangs (iOS
  // watchdog), the stuck overlay covers the landing.
  if (status === "loading") {
    return (
      <>
        <Suspense fallback={<LoadingScreen stuck={false} onReload={handleStuckReload} />}>
          <LandingPage />
        </Suspense>
        {stuckLoading ? (
          <div className="fixed inset-0 z-50 bg-background">
            <LoadingScreen stuck onReload={handleStuckReload} />
          </div>
        ) : null}
      </>
    );
  }

  if (status !== "authenticated") {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    );
  }

  // Show a full-screen loading overlay while the user's data is being restored
  // after sign-in. This prevents a flash of the app UI before the
  // "Welcome back!" dialog appears.
  if (!restoreReady) {
    return <LoadingScreen stuck={stuckLoading} onReload={handleStuckReload} />;
  }

  return (
    <>
      <Header />
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
        <SettingsBanner />
      <main className="scroll-mt-20">
        <section id="section-upload" className="scroll-mt-20">
          <ImageUpload />
        </section>
        <WorkflowProgress />
        <section id="section-pre-reading" className="scroll-mt-20">
          <PreReading />
        </section>
        <section id="section-summary" className="scroll-mt-20">
          <Summary />
        </section>
        <section id="section-mindmap" className="scroll-mt-20">
          <MindMap />
        </section>
        <section id="section-visualization" className="scroll-mt-20">
          <Visualization />
        </section>
        <section id="section-adapted" className="scroll-mt-20">
          <AdaptedText />
        </section>
        <section id="section-glossary" className="scroll-mt-20">
          <Glossary />
        </section>
        <section id="section-collocations" className="scroll-mt-20">
          <Collocations />
        </section>
        <section id="section-test" className="scroll-mt-20">
          <ReadingTest />
        </section>
        <section id="section-grammar" className="scroll-mt-20">
          <Grammar />
        </section>
      </main>
      <TutorChatFab />
      <ReadAlongIndicator />
      <LearningRecommendationDialog />
      <Suspense fallback={null}>
        <OnboardingDialog />
      </Suspense>
      <Suspense fallback={null}>
        <DeepLinkEffects />
      </Suspense>
      <Footer />
    </div>
    </>
  );
}
