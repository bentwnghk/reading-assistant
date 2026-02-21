"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  History,
  Keyboard,
  Info,
  GraduationCap,
  BookOpen,
  PenTool,
  Volume2,
  Camera,
  Brain,
  Sparkles,
  Gamepad2,
  Layers,
  ClipboardList,
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
  const { setOpenSetting, setOpenHistory } = useGlobalStore();

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
        restore(session);
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
        <h1 className="text-left text-xl font-semibold">
          {t("title")}
          <small className="ml-2 font-normal text-base">v{VERSION}</small>
        </h1>
        <div className="flex">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            title={t("header.about.title")}
            onClick={() => setOpenAbout(true)}
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              {t("header.about.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {t("header.about.description")}
            </p>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4" />
                {t("header.about.objectives.title")}
              </h3>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li>🎯 {t("header.about.objectives.personalized")}</li>
                <li>🧠 {t("header.about.objectives.comprehension")}</li>
                <li>📚 {t("header.about.objectives.vocabulary")}</li>
                <li>🎮 {t("header.about.objectives.gamification")}</li>
                <li>🔒 {t("header.about.objectives.privacy")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" />
                {t("header.about.features.title")}
              </h3>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> {t("header.about.features.ocr")}
                </li>
                <li className="flex items-center gap-1">
                  <PenTool className="h-3 w-3" /> {t("header.about.features.adaptation")}
                </li>
                <li className="flex items-center gap-1">
                  <Brain className="h-3 w-3" /> {t("header.about.features.visual")}
                </li>
                <li className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {t("header.about.features.glossary")}
                </li>
                <li className="flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {t("header.about.features.flashcard")}
                </li>
                <li className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" /> {t("header.about.features.quiz")}
                </li>
                <li className="flex items-center gap-1">
                  <Gamepad2 className="h-3 w-3" /> {t("header.about.features.spelling")}
                </li>
                <li className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" /> {t("header.about.features.tts")}
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <span className="text-base">🔄</span>
                {t("header.about.workflow.title")}
              </h3>
              <ol className="space-y-1 text-muted-foreground ml-6 list-decimal list-inside">
                <li>{t("header.about.workflow.upload")}</li>
                <li>{t("header.about.workflow.extract")}</li>
                <li>{t("header.about.workflow.summarize")}</li>
                <li>{t("header.about.workflow.visualize")}</li>
                <li>{t("header.about.workflow.adapt")}</li>
                <li>{t("header.about.workflow.test")}</li>
                <li>{t("header.about.workflow.learn")}</li>
              </ol>
            </div>

            <div className="pt-2 border-t text-center text-muted-foreground text-xs">
              {t("header.about.builtWith")}
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
