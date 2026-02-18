"use client";
import dynamic from "next/dynamic";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useGlobalStore } from "@/store/global";
import { useSettingStore } from "@/store/setting";
import useAutoSave from "@/hooks/useAutoSave";

const Header = dynamic(() => import("@/components/Internal/Header"));
const Setting = dynamic(() => import("@/components/Setting"));
const History = dynamic(() => import("@/components/History"));
const StudentInfo = dynamic(() => import("@/components/ReadingAssistant/StudentInfo"));
const ImageUpload = dynamic(() => import("@/components/ReadingAssistant/ImageUpload"));
const WorkflowProgress = dynamic(() => import("@/components/ReadingAssistant/WorkflowProgress"));
const ExtractedText = dynamic(() => import("@/components/ReadingAssistant/ExtractedText"));
const Summary = dynamic(() => import("@/components/ReadingAssistant/Summary"));
const AdaptedText = dynamic(() => import("@/components/ReadingAssistant/AdaptedText"));
const MindMap = dynamic(() => import("@/components/ReadingAssistant/MindMap"));
const ReadingTest = dynamic(() => import("@/components/ReadingAssistant/ReadingTest"));
const Glossary = dynamic(() => import("@/components/ReadingAssistant/Glossary"));

function Home() {
  const { t } = useTranslation();
  const { openSetting, setOpenSetting, openHistory, setOpenHistory } = useGlobalStore();
  const { theme } = useSettingStore();
  const { setTheme } = useTheme();

  useAutoSave();

  useLayoutEffect(() => {
    const settingStore = useSettingStore.getState();
    setTheme(settingStore.theme);
  }, [theme, setTheme]);

  return (
    <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
      <Header />
      <main>
        <StudentInfo />
        <ImageUpload />
        <WorkflowProgress />
        <ExtractedText />
        <Summary />
        <MindMap />
        <AdaptedText />
        <ReadingTest />
        <Glossary />
      </main>
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
