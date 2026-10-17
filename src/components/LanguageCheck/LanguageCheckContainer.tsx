"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Download,
  GraduationCap,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ScanText,
  SpellCheck,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LanguageCheckHome from "@/components/LanguageCheck/LanguageCheckHome";
import LearnSetupDialog from "@/components/LanguageCheck/Learn/LearnSetupDialog";
import PageStaging, { type StagedPage } from "@/components/LanguageCheck/PageStaging";
import ReviewStage from "@/components/LanguageCheck/ReviewStage";
import ResultsView from "@/components/LanguageCheck/ResultsView";
import ScanViewer from "@/components/LanguageCheck/ScanViewer";
import {
  ExplanationLanguageToggle,
  useCategoryLabel,
} from "@/components/LanguageCheck/shared";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  abortLanguageCheck,
  useLanguageCheckStore,
} from "@/store/languageCheck";
import { useSettingStore } from "@/store/setting";
import {
  LANGUAGE_CHECK_MAX_IMAGE_CHARS,
  LANGUAGE_CHECK_MAX_PAGES,
  LANGUAGE_CHECK_RETENTION_DAYS,
  LANGUAGE_CHECK_STAGING_MAX_SIDE,
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
  const [staged, setStaged] = useState<StagedPage[]>([]);

  useEffect(() => {
    loadList().catch((e) => toast.error(parseError(e)));
  }, [loadList]);

  // Pages are staged (and optionally cropped) before anything is uploaded, so
  // a multi-page essay can be built from several camera shots. Ephemeral UI
  // state: nothing is persisted or sent until the user starts the transcription.
  async function handleFiles(files: File[]) {
    const room = LANGUAGE_CHECK_MAX_PAGES - staged.length;
    if (room <= 0) {
      toast.error(t("languageCheck.upload.tooManyPages", { max: LANGUAGE_CHECK_MAX_PAGES }));
      return;
    }
    setPreparing(true);
    try {
      const added: StagedPage[] = [];
      let overflow = false;
      for (const file of files) {
        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const sources = isPdf
          ? await processPdfFile(file)
          : [await readFileAsDataURL(file)];
        for (const source of sources) {
          if (added.length >= room) {
            overflow = true;
            break;
          }
          // Re-encoding through a canvas also bakes in the EXIF orientation of phone photos.
          const original = await downscaleImage(
            source,
            LANGUAGE_CHECK_STAGING_MAX_SIDE,
            0.92,
          );
          added.push({ id: crypto.randomUUID(), original, src: original });
        }
        if (overflow) break;
      }
      if (added.length === 0) {
        toast.error(t("languageCheck.upload.unsupported"));
        return;
      }
      if (overflow) {
        toast.warning(t("languageCheck.upload.tooManyPages", { max: LANGUAGE_CHECK_MAX_PAGES }));
      }
      setStaged((prev) => [...prev, ...added]);
    } catch (error) {
      console.error("Language check upload failed:", error);
      toast.error(parseError(error));
    } finally {
      setPreparing(false);
    }
  }

  async function handleStart() {
    if (staged.length === 0) return;
    setPreparing(true);
    try {
      const pages: string[] = [];
      for (const page of staged) pages.push(await preparePage(page.src));
      const essay = await create(pages, useSettingStore.getState().ocrModel);
      setStaged([]);
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
    return (
      <LanguageCheckHome
        essayListProps={{
          preparing,
          onFiles: handleFiles,
          onOpen: handleOpen,
          staging:
            staged.length > 0 ? (
              <PageStaging
                pages={staged}
                max={LANGUAGE_CHECK_MAX_PAGES}
                busy={preparing}
                onPagesChange={setStaged}
                onFiles={handleFiles}
                onStart={handleStart}
              />
            ) : undefined,
        }}
      />
    );
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
  const [learnOpen, setLearnOpen] = useState(false);
  const [title, setTitle] = useState(essay.title);

  const busyHere = generatingId === essay.id;
  const checkRunning = busyHere && !!generating["language-check"];
  const ocrRunning = busyHere && !!generating["ocr"];

  // Past the retention window the essay becomes a read-only archive: the
  // scans are purged server-side, so scan/edit/recheck are disabled while
  // the transcript and corrections stay viewable.
  const expired =
    Date.now() - essay.createdAt >=
    LANGUAGE_CHECK_RETENTION_DAYS * 86_400_000;
  const expiredTitle = expired
    ? t("languageCheck.results.expiredDisabled")
    : undefined;

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

  const steps: {
    id: "review" | "results";
    label: string;
    done: boolean;
    disabled: boolean;
    title?: string;
  }[] = [
    {
      id: "review",
      label: t("languageCheck.page.steps.review"),
      done: hasResults,
      disabled: expired,
      title: expiredTitle,
    },
    {
      id: "results",
      label: t("languageCheck.page.steps.results"),
      done: false,
      disabled: !hasResults,
    },
  ];

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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ol
          className="flex items-center gap-1.5 text-sm"
          aria-label={t("languageCheck.page.steps.label")}
        >
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-3 w-3" />
            </span>
            {t("languageCheck.page.steps.scan")}
          </li>
          {steps.map((step, i) => {
            const current = effective === step.id;
            return (
              <li key={step.id} className="flex items-center gap-1.5">
                <span className="h-px w-4 bg-border" aria-hidden />
                <button
                  type="button"
                  disabled={step.disabled || current}
                  title={step.title}
                  aria-current={current ? "step" : undefined}
                  onClick={() => setView(step.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    current
                      ? "bg-primary/10 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                      current
                        ? "bg-primary text-primary-foreground"
                        : step.done
                          ? "bg-green-600 text-white"
                          : "border",
                    )}
                  >
                    {step.done && !current ? <Check className="h-3 w-3" /> : i + 2}
                  </span>
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>

        {effective === "results" && (
          <div className="flex flex-wrap items-center gap-2">
            <ExplanationLanguageToggle language={language} onChange={setLanguage} />
            {checkRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => abortLanguageCheck("language-check")}
              >
                <Square className="mr-1.5 h-3.5 w-3.5" />
                {t("languageCheck.stop")}
              </Button>
            )}
            <Button
              size="sm"
              disabled={essay.corrections.length === 0}
              title={
                essay.corrections.length === 0
                  ? t("languageCheck.learn.noMistakes")
                  : undefined
              }
              onClick={() => setLearnOpen(true)}
            >
              <GraduationCap className="mr-1.5 h-4 w-4" />
              {t("languageCheck.learn.button")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting || !hasResults}
              onClick={handleExport}
            >
              {exporting ? (
                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              {t("languageCheck.results.export")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t("languageCheck.page.more")}
                  title={t("languageCheck.page.more")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={expired}
                  title={expiredTitle}
                  onSelect={() => setScanOpen(true)}
                >
                  <ScanText className="mr-2 h-4 w-4" />
                  {t("languageCheck.results.viewScan")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={ocrRunning || checkRunning || expired}
                  title={expiredTitle}
                  onSelect={() => void handleRecheck()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("languageCheck.results.recheck")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {effective === "results" && hasResults ? (
        <>
          {expired && (
            <p className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              {t("languageCheck.results.expiredNotice", {
                days: LANGUAGE_CHECK_RETENTION_DAYS,
              })}
            </p>
          )}
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

      {learnOpen && (
        <LearnSetupDialog essay={essay} open={learnOpen} onOpenChange={setLearnOpen} />
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
