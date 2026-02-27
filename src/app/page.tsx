"use client";
import dynamic from "next/dynamic";
import { useLayoutEffect, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";
import { useHistoryStore } from "@/store/history";
import { setHistorySyncFn, useReadingStore } from "@/store/reading";
import useAutoSave from "@/hooks/useAutoSave";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const Header = dynamic(() => import("@/components/Internal/Header"));
const SettingsBanner = dynamic(() => import("@/components/Internal/SettingsBanner"));
const Setting = dynamic(() => import("@/components/Setting"));
const History = dynamic(() => import("@/components/History"));
const StudentInfo = dynamic(() => import("@/components/ReadingAssistant/StudentInfo"));
const ImageUpload = dynamic(() => import("@/components/ReadingAssistant/ImageUpload"));
const WorkflowProgress = dynamic(() => import("@/components/ReadingAssistant/WorkflowProgress"));
const Summary = dynamic(() => import("@/components/ReadingAssistant/Summary"));
const AdaptedText = dynamic(() => import("@/components/ReadingAssistant/AdaptedText"));
const MindMap = dynamic(() => import("@/components/ReadingAssistant/MindMap"));
const ReadingTest = dynamic(() => import("@/components/ReadingAssistant/ReadingTest"));
const Glossary = dynamic(() => import("@/components/ReadingAssistant/Glossary"));
const TocFab = dynamic(() => import("@/components/ReadingAssistant/TocFab"));
const TutorChatFab = dynamic(() => import("@/components/ReadingAssistant/TutorChatFab"));

function Home() {
  const { t } = useTranslation();
  const { openSetting, setOpenSetting, openHistory, setOpenHistory } = useGlobalStore();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();
  const { extractedText, docTitle } = useReadingStore();
  const { generateTitle } = useReadingAssistant();

  useAutoSave();

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

  return (
    <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
      <Header />
      <SettingsBanner />
      <main>
        <section id="section-student-info">
          <StudentInfo />
        </section>
        <section id="section-upload">
          <ImageUpload />
        </section>
        <WorkflowProgress />
        <section id="section-summary">
          <Summary />
        </section>
        <section id="section-mindmap">
          <MindMap />
        </section>
        <section id="section-adapted">
          <AdaptedText />
        </section>
        <section id="section-test">
          <ReadingTest />
        </section>
        <section id="section-glossary">
          <Glossary />
        </section>
      </main>
      <TocFab />
      <TutorChatFab />
      <footer className="my-4 text-center text-sm text-gray-600 print:hidden">
        <a href="https://api.mr5ai.com/" target="_blank">
          {t("copyright", {
            name: "Mr.🆖 AI Hub",
          })}
        </a>
      </footer>
      <aside className="print:hidden">
        <Setting open={openSetting} onClose={() => setOpenSetting(false)} />
        <History open={openHistory} onClose={() => setOpenHistory(false)} />
      </aside>
    </div>
  );
}

export default Home;
