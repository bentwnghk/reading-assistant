"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  History,
  Keyboard,
  Info,
  BookOpen,
  BookCopy,
  PenTool,
  Volume2,
  Camera,
  Brain,
  Sparkles,
  Gamepad2,
  Layers,
  ClipboardList,
  Upload,
  FileText,
  Target,
  MessageSquareText,
  Zap,
  Shield,
  Trophy,
  CheckCircle2,
  Star,
  Rocket,
  Download,
} from "lucide-react";
import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalStore } from "@/store/global";
import { useReadingStore } from "@/store/reading";
import { downloadFile } from "@/utils/file";

const VERSION = process.env.NEXT_PUBLIC_VERSION;

function getSafeFilename(value: string): string {
  return (
    value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "reading-session"
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function Header() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openShortcuts, setOpenShortcuts] = useState<boolean>(false);
  const [openAbout, setOpenAbout] = useState<boolean>(false);
  const { setOpenSetting, setOpenHistory, hasOpenedAbout, setHasOpenedAbout } = useGlobalStore();
  const {
    extractedText,
    summary,
    mindMap,
    adaptedText,
    testCompleted,
    analyzedSentences,
    highlightedWords,
    glossary,
    spellingGameBestScore,
    vocabularyQuizScore,
  } = useReadingStore();

  const isWorkflowComplete = useMemo(
    () =>
      !!extractedText &&
      !!summary &&
      !!mindMap &&
      !!adaptedText &&
      testCompleted &&
      Object.keys(analyzedSentences).length > 0 &&
      highlightedWords.length > 0 &&
      glossary.length > 0 &&
      spellingGameBestScore > 0 &&
      vocabularyQuizScore > 0,
    [
      extractedText,
      summary,
      mindMap,
      adaptedText,
      testCompleted,
      analyzedSentences,
      highlightedWords,
      glossary,
      spellingGameBestScore,
      vocabularyQuizScore,
    ]
  );

  const showPulseAnimation = !hasOpenedAbout || !isWorkflowComplete;

  const exportSnapshot = useCallback(() => {
    const { backup } = useReadingStore.getState();
    const session = backup();
    const baseName = session.extractedText?.slice(0, 50) || "reading-session";
    downloadFile(
      JSON.stringify(session, null, 2),
      `${getSafeFilename(baseName)}.session.json`,
      "application/json;charset=utf-8"
    );
  }, []);

  const importSnapshot = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const session = JSON.parse(text);
        const { restore } = useReadingStore.getState();
        await restore(session);
      } catch (error) {
        console.error(error);
      }
    },
    []
  );

  const openSnapshotImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        key: "Ctrl/Cmd + ,",
        description: t("header.shortcuts.openSetting"),
      },
      {
        key: "Ctrl/Cmd + Shift + H",
        description: t("header.shortcuts.openHistory"),
      },
      {
        key: "Ctrl/Cmd + Shift + E",
        description: t("header.shortcuts.exportSession"),
      },
      {
        key: "Ctrl/Cmd + Shift + O",
        description: t("header.shortcuts.importSession"),
      },
      {
        key: "Ctrl/Cmd + Shift + /",
        description: t("header.shortcuts.toggleHelp"),
      },
    ],
    [t]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const withModifier = event.metaKey || event.ctrlKey;
      if (!withModifier) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (!event.shiftKey && key === ",") {
        event.preventDefault();
        setOpenSetting(true);
        return;
      }
      if (event.shiftKey && key === "h") {
        event.preventDefault();
        setOpenHistory(true);
        return;
      }
      if (event.shiftKey && key === "e") {
        event.preventDefault();
        exportSnapshot();
        return;
      }
      if (event.shiftKey && key === "o") {
        event.preventDefault();
        openSnapshotImport();
        return;
      }
      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        setOpenShortcuts((previous) => !previous);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportSnapshot, openSnapshotImport, setOpenHistory, setOpenSetting]);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    await importSnapshot(files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <header className="flex justify-between items-center my-6 max-sm:my-4 print:hidden">
        <h1 className="text-left text-xl font-semibold flex items-center gap-1.5 relative overflow-hidden group">
          <BookCopy className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-blue-600 dark:text-blue-400">Mr.</span>
          <span className="text-2xl leading-none">🆖</span>
          <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold relative">
            ProReader
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent animate-shimmer" />
          </span>
          <span className="ml-1 text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-normal">v{VERSION}</span>
        </h1>
        <div className="flex">
          <Button
            className={`h-8 w-8 ${showPulseAnimation ? "animate-pulse-ring" : ""}`}
            variant="ghost"
            size="icon"
            title={t("header.about.title")}
            onClick={() => {
              setOpenAbout(true);
              setHasOpenedAbout(true);
            }}
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            title={t("header.shortcuts.title")}
            onClick={() => setOpenShortcuts(true)}
          >
            <Keyboard className="h-5 w-5" />
          </Button>
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            title={t("history.title")}
            onClick={() => setOpenHistory(true)}
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            className="h-8 w-8"
            title={t("setting.title")}
            variant="ghost"
            size="icon"
            onClick={() => setOpenSetting(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <Dialog open={openShortcuts} onOpenChange={setOpenShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("header.shortcuts.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {shortcut.key}
                </span>
                <span>{shortcut.description}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openAbout} onOpenChange={setOpenAbout}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookCopy className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              {t("header.about.title")}
            </DialogTitle>
            <p className="text-muted-foreground text-sm mt-1">
              {t("header.about.tagline")}
            </p>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border">
              <p className="text-center font-medium text-base">
                {t("header.about.description")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Star className="h-4 w-4 text-yellow-500" />
                {t("header.about.whyLove.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.personalized.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.personalized.desc")}</div>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.gamified.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.gamified.desc")}</div>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <div className="font-medium text-xs">{t("header.about.whyLove.private.title")}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t("header.about.whyLove.private.desc")}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t("header.about.features.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Camera className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.ocr.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.ocr.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <PenTool className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.adaptation.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.adaptation.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Brain className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.visual.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.visual.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <MessageSquareText className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.sentenceAnalysis.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.sentenceAnalysis.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Target className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.test.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.test.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <BookOpen className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.glossary.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.glossary.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Layers className="h-4 w-4 mt-0.5 text-cyan-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.flashcard.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.flashcard.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Gamepad2 className="h-4 w-4 mt-0.5 text-pink-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.spelling.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.spelling.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <ClipboardList className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.quiz.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.quiz.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Volume2 className="h-4 w-4 mt-0.5 text-teal-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.tts.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.tts.desc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-card border rounded-md p-2">
                  <Download className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-medium">{t("header.about.features.wordExport.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("header.about.features.wordExport.desc")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <Rocket className="h-4 w-4 text-blue-500" />
                {t("header.about.workflow.title")}
              </h3>
              <div className="bg-card border rounded-lg p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold">1</span>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.upload")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold">2</span>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.summary")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs font-bold">3</span>
                    <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.mindmap")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs font-bold">4</span>
                    <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.adapt")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs font-bold">5</span>
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.test")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs font-bold">6</span>
                    <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.analyze")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 text-xs font-bold">7</span>
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.highlight")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 text-xs font-bold">8</span>
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.glossary")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-xs font-bold">9</span>
                    <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.spelling")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-xs font-bold">10</span>
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs">{t("header.about.workflow.vocabQuiz")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("header.about.skills.title")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {["mainIdea", "detail", "inference", "vocabulary", "purpose", "sequencing"].map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                    <span>{t(`header.about.skills.${skill}`)}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t text-center">
              <p className="text-muted-foreground text-xs">
                {t("header.about.builtWith")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => handleFileUpload(event.target.files)}
      />
    </>
  );
}

export default Header;
