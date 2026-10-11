"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  ImagePlus,
  Languages,
  LoaderCircle,
  ShieldCheck,
  SpellCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { parseError } from "@/utils/error";
import { STATUS_TONE } from "@/components/LanguageCheck/shared";
import {
  LANGUAGE_CHECK_ILLEGIBLE_MARKER,
  LANGUAGE_CHECK_MAX_PAGES,
  LANGUAGE_CHECK_RETENTION_DAYS,
} from "@/constants/languageCheck";

interface EssayListProps {
  preparing: boolean;
  onFiles: (files: File[]) => void;
  onOpen: (id: string) => void;
}

/** Upload zone + saved essays. */
export default function EssayList({ preparing, onFiles, onOpen }: EssayListProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const essays = useLanguageCheckStore((s) => s.essays);
  const listLoading = useLanguageCheckStore((s) => s.listLoading);
  const listLoaded = useLanguageCheckStore((s) => s.listLoaded);
  const remove = useLanguageCheckStore((s) => s.remove);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<LanguageCheckEssaySummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<"overview" | "transcript" | "results">("overview");

  // Same gate as StaffEssayLog: the staff-only card only shows for staff.
  const role = session?.user?.role;
  const isStaff =
    role === "teacher" || role === "admin" || role === "super-admin";

  // safePage clamps automatically when the list shrinks (deletion, retention
  // sweep on reload) so the controls never point past the last page.
  const totalPages = Math.max(1, Math.ceil(essays.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleEssays = essays.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function accept(list: FileList | File[] | null) {
    if (!list || preparing) return;
    const files = Array.from(list).filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.type === "application/pdf" ||
        f.name.toLowerCase().endsWith(".pdf"),
    );
    if (files.length === 0) {
      toast.error(t("languageCheck.upload.unsupported"));
      return;
    }
    onFiles(files);
  }

  // Paste a screenshot / photo straight from the clipboard.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length > 0) accept(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparing]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      setToDelete(null);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {t("languageCheck.title")}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowHelp(true)}
            title={t("languageCheck.help.title")}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("languageCheck.subtitle")}
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        {preparing ? (
          <>
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("languageCheck.upload.preparing")}</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{t("languageCheck.upload.drop")}</p>
            <p className="max-w-md text-xs text-muted-foreground">
              {t("languageCheck.upload.hint", { max: LANGUAGE_CHECK_MAX_PAGES })}
            </p>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />
              {t("languageCheck.upload.choose")}
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,application/pdf"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          {t("languageCheck.list.title")}
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("languageCheck.list.retentionHint", {
            days: LANGUAGE_CHECK_RETENTION_DAYS,
          })}
        </p>
        {listLoading && !listLoaded ? (
          <div className="flex justify-center py-8">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : essays.length === 0 ? (
          <p className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            {t("languageCheck.list.empty")}
          </p>
        ) : (
          <>
          <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
            {visibleEssays.map((essay) => (
              <li key={essay.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(essay.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {essay.title || t("languageCheck.list.untitled")}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(essay.updatedAt)} ·{" "}
                      {t("languageCheck.list.pages", { count: essay.pageCount })}
                      {essay.status === "checked" &&
                        ` · ${t("languageCheck.list.errors", { count: essay.errorCount })}`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_TONE[essay.status],
                    )}
                  >
                    {t(`languageCheck.list.status.${essay.status}`)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-auto w-10 shrink-0 text-muted-foreground hover:text-destructive"
                  title={t("languageCheck.list.delete")}
                  onClick={() => setToDelete(essay)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          {essays.length > pageSize && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("languageCheck.list.rowsPerPage")}:
                </span>
                {[10, 20, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs transition-colors",
                      pageSize === size
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - safePage) <= 1;
                  })
                  .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) {
                      acc.push("ellipsis");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "ellipsis" ? (
                      <span
                        key={`e${i}`}
                        className="px-1 text-xs text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={cn(
                          "h-7 w-7 rounded text-xs transition-colors",
                          safePage === item
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("languageCheck.list.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("languageCheck.list.deleteDesc", {
                title: toDelete?.title || t("languageCheck.list.untitled"),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              {t("languageCheck.cancel")}
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("languageCheck.list.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help guide — mirrors the /vocabulary help dialog pattern. */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {t("languageCheck.help.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["overview", "transcript", "results"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setHelpTab(tab)}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                  helpTab === tab
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`languageCheck.help.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {helpTab === "overview" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("languageCheck.help.overview.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <ImagePlus className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.overview.upload.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("languageCheck.help.overview.upload.desc", { max: LANGUAGE_CHECK_MAX_PAGES })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.overview.statuses.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.overview.statuses.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.overview.retention.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("languageCheck.help.overview.retention.desc", { days: LANGUAGE_CHECK_RETENTION_DAYS })}
                  </p>
                </div>
              </div>

              {isStaff && (
                <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{t("languageCheck.help.overview.staffLog.name")}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.overview.staffLog.desc")}</p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("languageCheck.help.overview.tip.title")}</span>{" "}
                  {t("languageCheck.help.overview.tip.desc")}
                </p>
              </div>
            </div>
          )}

          {helpTab === "transcript" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("languageCheck.help.transcript.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.transcript.review.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.transcript.review.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.transcript.verify.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.transcript.verify.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("languageCheck.help.transcript.illegible.name", { marker: LANGUAGE_CHECK_ILLEGIBLE_MARKER })}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("languageCheck.help.transcript.illegible.desc", { marker: LANGUAGE_CHECK_ILLEGIBLE_MARKER })}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("languageCheck.help.transcript.tip.title")}</span>{" "}
                  {t("languageCheck.help.transcript.tip.desc")}
                </p>
              </div>
            </div>
          )}

          {helpTab === "results" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("languageCheck.help.results.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <SpellCheck className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.results.tiers.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.results.tiers.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.results.filter.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.results.filter.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                  <Languages className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.results.language.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.results.language.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <Download className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("languageCheck.help.results.export.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("languageCheck.help.results.export.desc")}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("languageCheck.help.results.tip.title")}</span>{" "}
                  {t("languageCheck.help.results.tip.desc")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
