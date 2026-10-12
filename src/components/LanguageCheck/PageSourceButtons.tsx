"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function filterSupportedFiles(list: FileList | File[] | null): File[] {
  return Array.from(list ?? []).filter(
    (f) =>
      f.type.startsWith("image/") ||
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf"),
  );
}

/** True on touch-first devices (phones/tablets), where `capture` opens the camera. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return coarse;
}

interface PageSourceButtonsProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Pages are already staged: label the buttons as "add another". */
  hasPages?: boolean;
}

/**
 * File picker + (on touch devices) camera button. The camera input cannot take
 * several photos in one go, so each shot lands in the staging tray and the user
 * taps the button again for the next page.
 */
export default function PageSourceButtons({
  onFiles,
  disabled,
  hasPages,
}: PageSourceButtonsProps) {
  const { t } = useTranslation();
  const coarse = useCoarsePointer();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function accept(list: FileList | null) {
    if (!list || disabled) return;
    const files = filterSupportedFiles(list);
    if (files.length === 0) {
      toast.error(t("languageCheck.upload.unsupported"));
      return;
    }
    onFiles(files);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        size="sm"
        variant={coarse || hasPages ? "outline" : "default"}
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        {hasPages ? t("languageCheck.staging.addFiles") : t("languageCheck.upload.choose")}
      </Button>
      {coarse && (
        <Button
          size="sm"
          variant={hasPages ? "outline" : "default"}
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="mr-1.5 h-4 w-4" />
          {hasPages ? t("languageCheck.staging.takeAnother") : t("languageCheck.upload.camera")}
        </Button>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept="image/*,.pdf,application/pdf"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        hidden
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
