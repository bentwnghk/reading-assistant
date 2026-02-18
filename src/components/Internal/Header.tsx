"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, History, Keyboard } from "lucide-react";
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
