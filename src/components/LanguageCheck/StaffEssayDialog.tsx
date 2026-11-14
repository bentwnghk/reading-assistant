"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, LoaderCircle, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ResultsView from "@/components/LanguageCheck/ResultsView";
import AssessmentPanel from "@/components/LanguageCheck/AssessmentPanel";
import EnhancedEssayPanel from "@/components/LanguageCheck/EnhancedEssayPanel";
import ExportDialog from "@/components/LanguageCheck/ExportDialog";
import {
  ExplanationLanguageToggle,
  SegmentedTabs,
  STATUS_TONE,
} from "@/components/LanguageCheck/shared";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import { abortLanguageCheck, useLanguageCheckStore } from "@/store/languageCheck";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";
import { LANGUAGE_CHECK_RETENTION_DAYS } from "@/constants/languageCheck";

interface StaffEssayDialogProps {
  /** Essay to show (null = closed). */
  essayId: string | null;
  onClose: () => void;
  /** Called after the essay changed (re-check) so the caller can refresh its own data. */
  onChanged?: () => void;
}

/**
 * Read-only staff view of one student essay (assessment / corrections /
 * enhanced essays, re-check, export). Shared by the "Student essays" table
 * and the "Topic reports" student cards so both open the identical dialog.
 */
export default function StaffEssayDialog({ essayId, onClose, onChanged }: StaffEssayDialogProps) {
  const { t } = useTranslation();
  const { runStaffCheck } = useLanguageCheck();
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const setLanguage = useLanguageCheckStore((s) => s.setExplanationLanguage);
  const generating = useLanguageCheckStore((s) => s.activeGenerations);
  const generatingId = useLanguageCheckStore((s) => s.generatingEssayId);

  const [detail, setDetail] = useState<LanguageCheckStaffDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"assessment" | "corrections" | "enhanced">(
    "assessment",
  );
  const [exportOpen, setExportOpen] = useState(false);

  const openDetail = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/writing-assessment/staff/${id}`);
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        setDetail(body as LanguageCheckStaffDetail);
      } catch (error) {
        toast.error(parseError(error));
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    setDetail(null);
    setDetailTab("assessment");
    if (essayId) void openDetail(essayId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essayId]);

  const checkRunning =
    !!detail && generatingId === detail.id && !!generating["language-check"];

  async function handleStaffRecheck() {
    if (!detail) return;
    const ok = await runStaffCheck({
      id: detail.id,
      transcript: detail.transcript,
      title: detail.title,
      topic: detail.topic,
      essayType: detail.essayType,
      questionImage: detail.questionImage,
    });
    if (!ok) return;
    setDetailTab("assessment");
    void useLanguageCheckStore.getState().loadList(true);
    await openDetail(detail.id);
    onChanged?.();
  }

  if (!essayId) return null;

  const detailExpired =
    !!detail &&
    Date.now() - detail.createdAt >=
      LANGUAGE_CHECK_RETENTION_DAYS * 86_400_000;
  const hasTranscript = !!detail?.transcript.trim();
  const recheckDisabled =
    checkRunning ||
    !!generating["language-check"] ||
    !hasTranscript ||
    detailExpired;
  const recheckTitle = !hasTranscript
    ? t("languageCheck.check.noText")
    : detailExpired
      ? t("languageCheck.results.expiredDisabled")
      : undefined;

  const detailEssay: LanguageCheckEssay | null = detail
    ? {
        ...detail,
        ownerId: detail.userId,
        ownerName: detail.userName,
        ownerEmail: detail.userEmail,
        images: [],
      }
    : null;
  const detailHasResults =
    detail?.status === "checked" && detail.checkedText.length > 0;

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="h-[92vh] max-w-[min(95vw,72rem)] grid-rows-[auto_minmax(0,1fr)]"
        onInteractOutside={(e) => {
          // The Export dialog (and the Enhanced-Essays confirm dialog)
          // stack on top of this one. While a child dialog is open, an
          // outside interaction belongs to it — never to this dialog.
          if (exportOpen) {
            e.preventDefault();
            return;
          }
          // On touch, Radix defers a dialog's outside-pointer check to the
          // click that follows the tap. A tap on the child's Cancel/X
          // unmounts the child dialog (it is conditionally mounted) within
          // that same click, so this dialog is momentarily the top layer
          // again and receives the tap as an "outside" interaction whose
          // target has already been removed from the DOM — dismissing this
          // dialog too and dropping the staff member back to the table.
          // Stale interactions like that are ignored.
          const target = e.detail.originalEvent.target as Node | null;
          if (target && !target.isConnected) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {detail?.title || t("languageCheck.list.untitled")}
            {detail && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_TONE[detail.status],
                )}
              >
                {t(`languageCheck.list.status.${detail.status}`)}
              </span>
            )}
          </DialogTitle>
          {detail && (
            <DialogDescription>
              {detail.userName} · {detail.userEmail} ·{" "}
              {t("languageCheck.list.pages", { count: detail.pageCount })}
              {detail.wordCount > 0 &&
                ` · ${t("languageCheck.list.words", { count: detail.wordCount })}`}
              {detail.status === "checked" &&
                ` · ${t("languageCheck.list.errors", { count: detail.errorCount })}`}
            </DialogDescription>
          )}
        </DialogHeader>

        {detail && (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {formatDateTime(detail.createdAt)}
                {detail.checkModel &&
                  ` · ${t("languageCheck.results.checkedWith", { model: detail.checkModel })}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {checkRunning && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abortLanguageCheck("language-check")}
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    {t("languageCheck.stop")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recheckDisabled}
                  title={recheckTitle}
                  onClick={() => void handleStaffRecheck()}
                >
                  {checkRunning ? (
                    <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  {detail.status === "checked"
                    ? t("languageCheck.results.recheck")
                    : t("languageCheck.review.runCheck")}
                </Button>
                {detailHasResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportOpen(true)}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {t("languageCheck.results.export")}
                  </Button>
                )}
                <ExplanationLanguageToggle
                  language={language}
                  onChange={setLanguage}
                />
              </div>
            </div>

            {detail.status === "checked" && detail.checkedText ? (
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
                <SegmentedTabs
                  value={detailTab}
                  onChange={setDetailTab}
                  ariaLabel={t("languageCheck.results.tabsLabel")}
                  className="w-fit"
                  options={[
                    { value: "assessment", label: t("languageCheck.results.tabAssessment") },
                    { value: "corrections", label: t("languageCheck.results.tabCorrections") },
                    { value: "enhanced", label: t("languageCheck.results.tabEnhanced") },
                  ]}
                />
                {detailTab === "assessment" ? (
                  <AssessmentPanel
                    essay={detail}
                    language={language}
                    onSave={async (assessment) => {
                      const res = await fetch(
                        `/api/writing-assessment/staff/${detail.id}/assessment`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(assessment),
                        },
                      );
                      if (!res.ok) throw new Error("save failed");
                      setDetail((d) =>
                        d && d.id === detail.id ? { ...d, assessment } : d,
                      );
                    }}
                  />
                ) : detailTab === "enhanced" ? (
                  <EnhancedEssayPanel
                    essay={detail}
                    onSave={async (enhanced) => {
                      const res = await fetch(
                        `/api/writing-assessment/staff/${detail.id}/enhanced`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(enhanced),
                        },
                      );
                      if (!res.ok) throw new Error("save failed");
                      setDetail((d) =>
                        d && d.id === detail.id ? { ...d, enhanced } : d,
                      );
                    }}
                  />
                ) : detailEssay ? (
                  // Same view students see (ResultsView never reads `images`).
                  <ResultsView essay={detailEssay} language={language} embedded />
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {t("languageCheck.staff.detailNoCorrections")}
                </p>
                <div>
                  <p className="mb-2 text-sm font-semibold">
                    {t("languageCheck.staff.detailTranscript")}
                  </p>
                  <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
                    {detail.transcript || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {exportOpen && detailEssay && (
      <ExportDialog
        essay={detailEssay}
        language={language}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    )}
    </>
  );
}
