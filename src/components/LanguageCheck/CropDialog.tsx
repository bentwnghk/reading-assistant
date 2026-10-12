"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PercentRect } from "@/utils/image";

interface CropDialogProps {
  src: string;
  pageNumber: number;
  initialRect?: PercentRect;
  /** `null` = keep the whole page. */
  onApply: (rect: PercentRect | null) => Promise<void>;
  onClose: () => void;
}

/** Free-form crop (mouse + touch) over the full-resolution page. Mount only while open. */
export default function CropDialog({
  src,
  pageNumber,
  initialRect,
  onApply,
  onClose,
}: CropDialogProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState<PercentCrop | undefined>(
    initialRect ? { unit: "%", ...initialRect } : undefined,
  );
  const [busy, setBusy] = useState(false);

  const hasSelection = !!crop && crop.width > 0 && crop.height > 0;

  async function apply(rect: PercentRect | null) {
    setBusy(true);
    try {
      await onApply(rect);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-[min(95vw,48rem)] grid-rows-[auto_minmax(0,1fr)_auto] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("languageCheck.crop.title", { page: pageNumber })}</DialogTitle>
          <DialogDescription>{t("languageCheck.crop.hint")}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 items-center justify-center overflow-auto rounded-lg bg-muted/40 p-2">
          <ReactCrop
            crop={crop}
            onChange={(_, percent) => setCrop(percent)}
            minWidth={24}
            minHeight={24}
            keepSelection
            disabled={busy}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={t("languageCheck.review.pageAlt", { page: pageNumber })}
              style={{ maxHeight: "62vh", maxWidth: "100%" }}
              draggable={false}
            />
          </ReactCrop>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("languageCheck.cancel")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => apply(null)}>
            {t("languageCheck.crop.useFull")}
          </Button>
          <Button
            disabled={busy || !hasSelection}
            onClick={() =>
              crop &&
              apply({ x: crop.x, y: crop.y, width: crop.width, height: crop.height })
            }
          >
            {busy && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("languageCheck.crop.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
