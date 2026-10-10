"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
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
import {
  LANGUAGE_CHECK_MAX_PAGES,
  LANGUAGE_CHECK_RETENTION_DAYS,
} from "@/constants/languageCheck";

interface EssayListProps {
  preparing: boolean;
  onFiles: (files: File[]) => void;
  onOpen: (id: string) => void;
}

const STATUS_TONE: Record<LanguageCheckEssaySummary["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  transcribed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  checked: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

/** Upload zone + saved essays. */
export default function EssayList({ preparing, onFiles, onOpen }: EssayListProps) {
  const { t } = useTranslation();
  const essays = useLanguageCheckStore((s) => s.essays);
  const listLoading = useLanguageCheckStore((s) => s.listLoading);
  const listLoaded = useLanguageCheckStore((s) => s.listLoaded);
  const remove = useLanguageCheckStore((s) => s.remove);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<LanguageCheckEssaySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        <h1 className="text-2xl font-bold">{t("languageCheck.title")}</h1>
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
          <ul className="flex flex-col gap-2">
            {essays.map((essay) => (
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
                      {` · ${t("languageCheck.list.expires", {
                        date: formatDateTime(
                          essay.createdAt +
                            LANGUAGE_CHECK_RETENTION_DAYS * 86_400_000,
                        ),
                      })}`}
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
    </div>
  );
}
