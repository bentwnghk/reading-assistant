"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Crop, LoaderCircle, ScanText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CropDialog from "@/components/LanguageCheck/CropDialog";
import PageSourceButtons from "@/components/LanguageCheck/PageSourceButtons";
import { cropImage, type PercentRect } from "@/utils/image";
import { parseError } from "@/utils/error";

export interface StagedPage {
  id: string;
  /** Full page, orientation baked in. Crops always start from this. */
  original: string;
  /** What will be transcribed: `original`, or a crop of it. */
  src: string;
  rect?: PercentRect;
}

interface PageStagingProps {
  pages: StagedPage[];
  max: number;
  busy: boolean;
  onPagesChange: (pages: StagedPage[]) => void;
  onFiles: (files: File[]) => void;
  onStart: () => void;
}

/** Pages waiting to be transcribed: crop, reorder, remove, add more. */
export default function PageStaging({
  pages,
  max,
  busy,
  onPagesChange,
  onFiles,
  onStart,
}: PageStagingProps) {
  const { t } = useTranslation();
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const cropping = pages.find((p) => p.id === croppingId);

  function move(index: number, delta: -1 | 1) {
    const next = [...pages];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onPagesChange(next);
  }

  async function applyCrop(rect: PercentRect | null) {
    if (!cropping) return;
    try {
      const update: Partial<StagedPage> = rect
        ? { src: await cropImage(cropping.original, rect), rect }
        : { src: cropping.original, rect: undefined };
      onPagesChange(pages.map((p) => (p.id === cropping.id ? { ...p, ...update } : p)));
      setCroppingId(null);
    } catch (error) {
      toast.error(parseError(error) || t("languageCheck.crop.failed"));
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="text-left">
        <h2 className="text-sm font-semibold">
          {t("languageCheck.staging.title", { count: pages.length, max })}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("languageCheck.staging.hint")}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {pages.map((page, i) => (
          <li key={page.id} className="flex flex-col overflow-hidden rounded-lg border bg-background">
            <div className="relative aspect-[3/4] bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.src}
                alt={t("languageCheck.review.pageAlt", { page: i + 1 })}
                className="h-full w-full object-contain"
                draggable={false}
              />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                {i + 1}
              </span>
              {page.rect && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground shadow-sm">
                  {t("languageCheck.staging.cropped")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 border-t p-1">
              <div className="flex items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                  title={t("languageCheck.staging.moveEarlier")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy || i === pages.length - 1}
                  onClick={() => move(i, 1)}
                  title={t("languageCheck.staging.moveLater")}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busy}
                  onClick={() => setCroppingId(page.id)}
                  title={t("languageCheck.staging.crop")}
                >
                  <Crop className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => onPagesChange(pages.filter((p) => p.id !== page.id))}
                  title={t("languageCheck.staging.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pages.length < max && (
            <PageSourceButtons hasPages disabled={busy} onFiles={onFiles} />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={busy}
            onClick={() => onPagesChange([])}
          >
            {t("languageCheck.staging.discard")}
          </Button>
        </div>
        <Button size="sm" disabled={busy || pages.length === 0} onClick={onStart}>
          {busy ? (
            <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ScanText className="mr-1.5 h-4 w-4" />
          )}
          {busy ? t("languageCheck.upload.preparing") : t("languageCheck.staging.start")}
        </Button>
      </div>

      {cropping && (
        <CropDialog
          key={cropping.id}
          src={cropping.original}
          pageNumber={pages.indexOf(cropping) + 1}
          initialRect={cropping.rect}
          onApply={applyCrop}
          onClose={() => setCroppingId(null)}
        />
      )}
    </div>
  );
}
