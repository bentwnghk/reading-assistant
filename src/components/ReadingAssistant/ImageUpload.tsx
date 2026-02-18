"use client";
import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Image as ImageIcon, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";

function ImageUpload() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { originalImage, extractedText } = useReadingStore();
  const { status, extractTextFromImage } = useReadingAssistant();
  const isExtracting = status === "extracting";

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        if (imageData) {
          await extractTextFromImage(imageData);
        }
      };
      reader.readAsDataURL(file);
    },
    [extractTextFromImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    useReadingStore.getState().reset();
  };

  return (
    <section className="p-4 border rounded-md mt-4">
      <h3 className="font-semibold text-lg border-b mb-4 leading-10">
        {t("reading.imageUpload.title")}
      </h3>

      {originalImage && extractedText ? (
        <div className="space-y-4">
          <div className="relative group">
            <img
              src={originalImage}
              alt="Uploaded"
              className="max-h-64 mx-auto rounded-lg border object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {t("reading.imageUpload.uploadNew")}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            isExtracting && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />

          {isExtracting ? (
            <div className="flex flex-col items-center gap-2">
              <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">
                {t("reading.imageUpload.extracting")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 rounded-full bg-muted">
                {isDragging ? (
                  <ImageIcon className="h-8 w-8 text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium">
                  {t("reading.imageUpload.dropHere")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("reading.imageUpload.orClick")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("reading.imageUpload.supportedFormats")}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ImageUpload;
