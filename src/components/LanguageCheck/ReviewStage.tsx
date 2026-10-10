"use client";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, RefreshCw, ScanText, SpellCheck, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScanViewer from "@/components/LanguageCheck/ScanViewer";
import { useMobile } from "@/hooks/useMobile";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  abortLanguageCheck,
  useLanguageCheckStore,
} from "@/store/languageCheck";
import { parseError } from "@/utils/error";

interface ReviewStageProps {
  essay: LanguageCheckEssay;
  /** Called after a successful language check (switches to the results view). */
  onChecked: () => void;
}

const SAVE_DEBOUNCE_MS = 800;

/** Step 2: review the digitised transcript alongside the original scan(s). */
export default function ReviewStage({ essay, onChecked }: ReviewStageProps) {
  const { t } = useTranslation();
  const isMobile = useMobile(1024);
  const { transcribe, runCheck } = useLanguageCheck();
  const updateLocal = useLanguageCheckStore((s) => s.updateLocal);
  const save = useLanguageCheckStore((s) => s.save);
  const generating = useLanguageCheckStore((s) => s.activeGenerations);
  const generatingId = useLanguageCheckStore((s) => s.generatingEssayId);
  const progress = useLanguageCheckStore((s) => s.progress);
  const verifyTranscription = useLanguageCheckStore((s) => s.verifyTranscription);
  const setVerifyTranscription = useLanguageCheckStore((s) => s.setVerifyTranscription);

  const busyHere = generatingId === essay.id;
  const ocrRunning = busyHere && !!generating["ocr"];
  const checkRunning = busyHere && !!generating["language-check"];
  const otherBusy = !busyHere && (generating["ocr"] || generating["language-check"]);

  // Debounced persistence of manual transcript edits, flushed on unmount.
  const pending = useRef<{ id: string; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    save(p.id, { transcript: p.text }).catch((e) =>
      toast.error(parseError(e)),
    );
  }

  function handleChange(text: string) {
    updateLocal(essay.id, { transcript: text });
    pending.current = { id: essay.id, text };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flush, []);

  const words = essay.transcript.split(/\s+/).filter(Boolean).length;
  const changedSinceCheck =
    essay.status === "checked" && essay.transcript !== essay.checkedText;

  async function handleCheck() {
    flush();
    if (await runCheck(essay.id)) onChecked();
  }

  function handleRetranscribe() {
    // Re-running OCR replaces the transcript, including manual edits.
    if (essay.transcript.trim() && !window.confirm(t("languageCheck.ocr.retryConfirm"))) {
      return;
    }
    void transcribe(essay.id);
  }

  const transcriptPane = (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("languageCheck.review.transcript")}</p>
        <p className="text-xs text-muted-foreground">
          {ocrRunning && progress
            ? t("languageCheck.ocr.progress", {
                current: progress.current,
                total: progress.total,
              })
            : t("languageCheck.review.wordCount", { count: words })}
        </p>
      </div>
      <Textarea
        value={essay.transcript}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={ocrRunning || checkRunning}
        placeholder={
          ocrRunning
            ? t("languageCheck.ocr.working")
            : t("languageCheck.review.placeholder")
        }
        // Proofreading target: suppress browser help that would "fix" errors.
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        lang="en"
        className="min-h-[18rem] flex-1 resize-none text-base leading-relaxed lg:h-full"
      />
      <p className="text-xs text-muted-foreground">
        {t("languageCheck.review.paragraphHint")}
      </p>
    </div>
  );

  const scanPane = <ScanViewer images={essay.images} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("languageCheck.review.hint")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ocrRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => abortLanguageCheck("ocr")}
            >
              <Square className="mr-1.5 h-3.5 w-3.5" />
              {t("languageCheck.stop")}
            </Button>
          ) : (
            <>
              <label
                className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
                title={t("languageCheck.ocr.verifyHint")}
              >
                <Switch
                  checked={verifyTranscription}
                  onCheckedChange={setVerifyTranscription}
                  disabled={checkRunning || !!otherBusy}
                  aria-label={t("languageCheck.ocr.verify")}
                />
                {t("languageCheck.ocr.verify")}
              </label>
              <Button
                variant="outline"
                size="sm"
                disabled={checkRunning || !!otherBusy}
                onClick={handleRetranscribe}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t("languageCheck.ocr.retry")}
              </Button>
            </>
          )}
          {checkRunning ? (
            <Button size="sm" onClick={() => abortLanguageCheck("language-check")}>
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
              {t("languageCheck.check.working")}
              {progress && progress.total > 1
                ? ` (${progress.current}/${progress.total})`
                : ""}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={ocrRunning || !!otherBusy || !essay.transcript.trim()}
              onClick={handleCheck}
            >
              <SpellCheck className="mr-1.5 h-4 w-4" />
              {t("languageCheck.review.runCheck")}
            </Button>
          )}
        </div>
      </div>

      {changedSinceCheck && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {t("languageCheck.review.changedSince")}
        </p>
      )}

      {isMobile ? (
        <Tabs defaultValue="transcript">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">
              <ScanText className="mr-1.5 h-4 w-4" />
              {t("languageCheck.review.scan")}
            </TabsTrigger>
            <TabsTrigger value="transcript">
              {t("languageCheck.review.transcript")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="h-[65vh]">
            {scanPane}
          </TabsContent>
          <TabsContent value="transcript">{transcriptPane}</TabsContent>
        </Tabs>
      ) : (
        <div className="h-[calc(100vh-15rem)] min-h-[28rem]">
          <ResizablePanelGroup direction="horizontal" className="gap-1">
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full pr-2">{scanPane}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full pl-2">{transcriptPane}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
}
