"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Download, GripVertical, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategoryLabel } from "@/components/LanguageCheck/shared";
import {
  LANGUAGE_CHECK_EXPORT_SECTIONS,
  availableLanguageCheckExportSections,
  exportLanguageCheckDocx,
  type LanguageCheckExportSection,
} from "@/utils/languageCheckExport";
import type { ExplanationLanguage } from "@/store/languageCheck";
import { cn } from "@/utils/style";
import { parseError } from "@/utils/error";

/** Locale key of each section's label (same text becomes its Word heading). */
const LABEL_KEYS: Record<LanguageCheckExportSection, string> = {
  assessment: "languageCheck.export.scores",
  marked: "languageCheck.export.marked",
  corrected: "languageCheck.export.corrected",
  polished: "languageCheck.export.polished",
  notes: "languageCheck.export.notes",
  "enhanced-light": "languageCheck.export.enhancedLight",
  "enhanced-heavy": "languageCheck.export.enhancedHeavy",
};

/** Why a section cannot be ticked (only for sections that can be unavailable). */
const UNAVAILABLE_KEYS: Partial<Record<LanguageCheckExportSection, string>> = {
  polished: "languageCheck.exportDialog.unavailablePolished",
  "enhanced-light": "languageCheck.exportDialog.unavailableEnhanced",
  "enhanced-heavy": "languageCheck.exportDialog.unavailableEnhanced",
};

interface ExportDialogProps {
  essay: LanguageCheckEssay;
  language: ExplanationLanguage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Export to Word" picker: tick the sections to include and arrange the order
 * they appear in the document. The title/subtitle and student block are
 * mandatory and fixed, so they are not listed. Defaults refresh each time the
 * dialog opens (e.g. enhanced essays generated meanwhile become tickable).
 */
export default function ExportDialog({ essay, language, open, onOpenChange }: ExportDialogProps) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();

  const [order, setOrder] = useState<LanguageCheckExportSection[]>([
    ...LANGUAGE_CHECK_EXPORT_SECTIONS,
  ]);
  const [included, setIncluded] = useState<Set<LanguageCheckExportSection>>(new Set());
  const [exporting, setExporting] = useState(false);

  const available = new Set(availableLanguageCheckExportSections(essay));

  // Fresh defaults on every open: every available section ticked, default order
  // (Scores & Feedbacks → Marked Essay → Correction Notes → Corrected Essay →
  // Polished Essay → Enhanced (Light Polish) → Enhanced (5** Rewrite)).
  useEffect(() => {
    if (!open) return;
    setOrder([...LANGUAGE_CHECK_EXPORT_SECTIONS]);
    setIncluded(new Set(availableLanguageCheckExportSections(essay)));
  }, [open, essay]);

  function toggle(section: LanguageCheckExportSection) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    setOrder((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function confirm() {
    if (exporting) return;
    const sections = order.filter((s) => included.has(s) && available.has(s));
    if (sections.length === 0) return;
    setExporting(true);
    try {
      await exportLanguageCheckDocx({ essay, language, t, categoryLabel, sections });
      onOpenChange(false);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("languageCheck.exportDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("languageCheck.exportDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {t("languageCheck.exportDialog.sectionsTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("languageCheck.exportDialog.orderHint")}
            </p>
          </div>
          <ul className="space-y-1.5">
            {order.map((section, index) => {
              const canInclude = available.has(section);
              const checked = canInclude && included.has(section);
              const id = `export-section-${section}`;
              const unavailableKey = UNAVAILABLE_KEYS[section];
              return (
                <li
                  key={section}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                    checked ? "border-primary bg-primary/5" : "bg-card",
                    !canInclude && "opacity-60",
                  )}
                >
                  <GripVertical
                    className="h-4 w-4 shrink-0 text-muted-foreground/50"
                    aria-hidden
                  />
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={!canInclude}
                    onCheckedChange={() => toggle(section)}
                    aria-label={t(LABEL_KEYS[section])}
                  />
                  <label
                    htmlFor={id}
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer text-sm font-medium",
                      !canInclude && "cursor-not-allowed",
                    )}
                  >
                    {t(LABEL_KEYS[section])}
                    {!canInclude && unavailableKey && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t(unavailableKey)}
                      </span>
                    )}
                  </label>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0 || !canInclude}
                    onClick={() => move(index, -1)}
                    aria-label={t("languageCheck.exportDialog.moveUp")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === order.length - 1 || !canInclude}
                    onClick={() => move(index, 1)}
                    aria-label={t("languageCheck.exportDialog.moveDown")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
          {included.size === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400" aria-live="polite">
              {t("languageCheck.exportDialog.noneSelected")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("languageCheck.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void confirm()}
            disabled={included.size === 0 || exporting}
          >
            {exporting ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            {t("languageCheck.exportDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
