"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  Eye,
  LoaderCircle,
  Pencil,
  RefreshCw,
  ScanText,
  SpellCheck,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EssayList from "@/components/LanguageCheck/EssayList";
import ReviewStage from "@/components/LanguageCheck/ReviewStage";
import ResultsView from "@/components/LanguageCheck/ResultsView";
import ScanViewer from "@/components/LanguageCheck/ScanViewer";
import { useCategoryLabel } from "@/components/LanguageCheck/shared";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  abortLanguageCheck,
  useLanguageCheckStore,
} from "@/store/languageCheck";
import { useSettingStore } from "@/store/setting";
import {
  LANGUAGE_CHECK_MAX_IMAGE_CHARS,
  LANGUAGE_CHECK_MAX_PAGES,
  isExpressionCategory,
} from "@/constants/languageCheck";
import { downscaleImage, readFileAsDataURL } from "@/utils/image";
import { processPdfFile } from "@/utils/parser/pdfParser";
import { exportLanguageCheckDocx } from "@/utils/languageCheckExport";
import { parseError } from "@/utils/error";

type View = "auto" | "review" | "results";

/**
 * Downscale a page; retry smaller if it is still above the server cap. The
 * first rung keeps JPEG quality high: compression artefacts blur thin pen
 * strokes, and a model that cannot read a letter "reads" the word it expects.
 */
async function preparePage(dataUrl: string): Promise<string> {
  let out = await downscaleImage(dataUrl, 2000, 0.92);
  if (out.length > LANGUAGE_CHECK_MAX_IMAGE_CHARS) {
    out = await downscaleImage(dataUrl, 2000, 0.8);
  }
  if (out.length > LANGUAGE_CHECK_MAX_IMAGE_CHARS) {
    out = await downscaleImage(dataUrl, 1400, 0.7);
  }
  if (out.length > LANGUAGE_CHECK_MAX_IMAGE_CHARS) {
    throw new Error("Image is too large");
  }
  return out;
}

export default function LanguageCheckContainer() {
  const { t } = useTranslation();
  const { transcribe } = useLanguageCheck();
  const active = useLanguageCheckStore((s) => s.active);
  const activeLoading = useLanguageCheckStore((s) => s.activeLoading);
  const loadList = useLanguageCheckStore((s) => s.loadList);
  const open = useLanguageCheckStore((s) => s.open);
  const create = useLanguageCheckStore((s) => s.create);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    loadList().catch((e) => toast.error(parseError(e)));
  }, [loadList]);

  async function handleFiles(files: File[]) {
    setPreparing(true);
    try {
      const pages: string[] = [];
      for (const file of files) {
        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          for (const page of await processPdfFile(file)) {
            pages.push(await preparePage(page));
            if (pages.length > LANGUAGE_CHECK_MAX_PAGES) break;
          }
        } else {
          pages.push(await preparePage(await readFileAsDataURL(file)));
        }
        if (pages.length > LANGUAGE_CHECK_MAX_PAGES) break;
      }
      if (pages.length === 0) {
        toast.error(t("languageCheck.upload.unsupported"));
        return;
      }
      if (pages.length > LANGUAGE_CHECK_MAX_PAGES) {
        toast.error(t("languageCheck.upload.tooManyPages", { max: LANGUAGE_CHECK_MAX_PAGES }));
        return;
      }
      const essay = await create(pages, useSettingStore.getState().ocrModel);
      // Fire and forget: progress/state live in the store, so it survives navigation.
      void transcribe(essay.id);
    } catch (error) {
      console.error("Language check upload failed:", error);
      toast.error(parseError(error));
    } finally {
      setPreparing(false);
    }
  }

  async function handleOpen(id: string) {
    try {
      await open(id);
    } catch (error) {
      toast.error(parseError(error));
    }
  }

  if (activeLoading && !active) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!active) {
    return <EssayList preparing={preparing} onFiles={handleFiles} onOpen={handleOpen} />;
  }

  // key: reset the local view state when a different essay is opened.
  return <Workspace key={active.id} essay={active} />;
}

function Workspace({ essay }: { essay: LanguageCheckEssay }) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const { runCheck } = useLanguageCheck();
  const close = useLanguageCheckStore((s) => s.close);
  const save = useLanguageCheckStore((s) => s.save);
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const setLanguage = useLanguageCheckStore((s) => s.setExplanationLanguage);
  const generating = useLanguageCheckStore((s) => s.activeGenerations);
  const generatingId = useLanguageCheckStore((s) => s.generatingEssayId);
  const [view, setView] = useState<View>("auto");
  const [scanOpen, setScanOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState(essay.title);

  const busyHere = generatingId === essay.id;
  const checkRunning = busyHere && !!generating["language-check"];
  const ocrRunning = busyHere && !!generating["ocr"];

  // Results are shown once a check exists, unless the user chose to edit.
  const effective: Exclude<View, "auto"> =
    view !== "auto" ? view : essay.status === "checked" ? "results" : "review";

  // A title derived by OCR arrives after mount; adopt it unless being edited.
  useEffect(() => {
    setTitle(essay.title);
  }, [essay.title]);

  async function commitTitle() {
    const next = title.trim();
    if (next === essay.title) return;
    try {
      await save(essay.id, { title: next });
    } catch (error) {
      setTitle(essay.title);
      toast.error(parseError(error));
    }
  }

  async function handleRecheck() {
    if (await runCheck(essay.id)) setView("results");
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportLanguageCheckDocx({ essay, language, t, categoryLabel });
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setExporting(false);
    }
  }

  const hasResults = essay.status === "checked" && essay.checkedText.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={close}
          title={t("languageCheck.back")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("languageCheck.back")}
        </Button>
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={t("languageCheck.list.untitled")}
            aria-label={t("languageCheck.rename")}
            className="h-9 border-transparent bg-transparent text-base font-semibold shadow-none hover:border-input focus-visible:border-input"
          />
        </div>

        {effective === "review" && hasResults && (
          <Button variant="outline" size="sm" onClick={() => setView("results")}>
            <SpellCheck className="mr-1.5 h-4 w-4" />
            {t("languageCheck.review.backToResults")}
          </Button>
        )}

        {effective === "results" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
              <span className={language === "en" ? "font-semibold" : "text-muted-foreground"}>
                English
              </span>
              <Switch
                checked={language === "zh"}
                onCheckedChange={(c) => setLanguage(c ? "zh" : "en")}
                aria-label={t("languageCheck.results.explanationLanguage")}
              />
              <span className={language === "zh" ? "font-semibold" : "text-muted-foreground"}>
                繁體中文
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
              <ScanText className="mr-1.5 h-4 w-4" />
              {t("languageCheck.results.viewScan")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView("review")}>
              <Eye className="mr-1.5 h-4 w-4" />
              {t("languageCheck.results.editTranscript")}
            </Button>
            {checkRunning ? (
              <Button size="sm" onClick={() => abortLanguageCheck("language-check")}>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                {t("languageCheck.stop")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={ocrRunning}
                onClick={handleRecheck}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                {t("languageCheck.results.recheck")}
              </Button>
            )}
            <Button size="sm" disabled={exporting || !hasResults} onClick={handleExport}>
              {exporting ? (
                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              {t("languageCheck.results.export")}
            </Button>
          </div>
        )}
      </div>

      {effective === "results" && hasResults ? (
        <>
          <ResultsSummary essay={essay} checking={checkRunning} />
          {essay.corrections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center">
              <SpellCheck className="h-8 w-8 text-green-600" />
              <p className="font-medium">{t("languageCheck.results.noErrors")}</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {t("languageCheck.results.noErrorsHint")}
              </p>
            </div>
          ) : (
            <ResultsView essay={essay} language={language} />
          )}
        </>
      ) : (
        <ReviewStage
          essay={essay}
          onChecked={() => setView("results")}
        />
      )}

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="h-[92vh] max-w-[min(95vw,64rem)] grid-rows-[auto_minmax(0,1fr)]">
          <DialogHeader>
            <DialogTitle>{t("languageCheck.review.scan")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("languageCheck.review.hint")}
            </DialogDescription>
          </DialogHeader>
          <ScanViewer images={essay.images} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultsSummary({
  essay,
  checking,
}: {
  essay: LanguageCheckEssay;
  checking: boolean;
}) {
  const { t } = useTranslation();
  const suggestionTotal = essay.corrections.filter((e) =>
    isExpressionCategory(e.category),
  ).length;
  const errorTotal = essay.corrections.length - suggestionTotal;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {checking && <LoaderCircle className="h-4 w-4 animate-spin" />}
      <span className="font-medium text-foreground">
        {t("languageCheck.results.errorsFound", { count: errorTotal })}
        {suggestionTotal > 0 &&
          ` · ${t("languageCheck.results.suggestionsFound", { count: suggestionTotal })}`}
      </span>
      {essay.checkModel && (
        <span>{t("languageCheck.results.checkedWith", { model: essay.checkModel })}</span>
      )}
      {essay.droppedCount > 0 && (
        <span className="text-amber-700 dark:text-amber-400">
          {t("languageCheck.check.dropped", { count: essay.droppedCount })}
        </span>
      )}
      {essay.transcript !== essay.checkedText && (
        <span className="text-amber-700 dark:text-amber-400">
          {t("languageCheck.review.changedSince")}
        </span>
      )}
    </p>
  );
}
