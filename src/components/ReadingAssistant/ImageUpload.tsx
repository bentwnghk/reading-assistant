"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Image as ImageIcon, LoaderCircle, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageUpload() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { originalImages, extractedText } = useReadingStore();
  const { status, extractTextFromImage } = useReadingAssistant();
  const isExtracting = status === "extracting";
  const prevExtractingRef = useRef(isExtracting);

  useEffect(() => {
    if (prevExtractingRef.current && !isExtracting && extractedText) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    prevExtractingRef.current = isExtracting;
  }, [isExtracting, extractedText]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) => file.type.startsWith("image/"));
      
      if (imageFiles.length === 0) return;

      setExtractionProgress({ current: 1, total: imageFiles.length });

      for (let i = 0; i < imageFiles.length; i++) {
        setExtractionProgress({ current: i + 1, total: imageFiles.length });
        const imageData = await readFileAsDataURL(imageFiles[i]);
        await extractTextFromImage(imageData);
      }

      setExtractionProgress(null);
    },
    [extractTextFromImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
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
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearImage = (index: number) => {
    useReadingStore.getState().removeOriginalImage(index);
  };

  const clearAllImages = () => {
    useReadingStore.getState().reset();
  };

  const getExtractionMessage = () => {
    if (!extractionProgress) return t("reading.imageUpload.extracting");
    return t("reading.imageUpload.extractingProgress", {
      current: extractionProgress.current,
      total: extractionProgress.total,
    });
  };

  return (
    <section className="section-card section-header-accent mt-4">
      <h3 className="font-semibold text-lg border-b mb-4 leading-10 flex items-center justify-between">
        {t("reading.imageUpload.title")}
        {(originalImages.length > 0 || extractedText) && (
          <Button variant="outline" size="sm" onClick={clearAllImages} className="transition-transform active:scale-95">
            <X className="h-4 w-4 mr-1" />
            {t("reading.imageUpload.clearAll")}
          </Button>
        )}
      </h3>

      {showSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 animate-fade-in-scale">
          <CheckCircle className="h-5 w-5 text-green-500 animate-checkmark" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {t("reading.imageUpload.extractSuccess")}
          </span>
        </div>
      )}

      {originalImages.length > 0 && extractedText ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {originalImages.map((image, index) => (
              <div key={index} className="relative group animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <img
                  src={image}
                  alt={`Uploaded ${index + 1}`}
                  className="max-h-40 rounded-lg border object-contain transition-transform group-hover:scale-105"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 h-6 w-6 scale-90 group-hover:scale-100"
                  onClick={() => clearImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("reading.imageUpload.uploadNew")}
          </p>
          {isExtracting && (
            <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg animate-pulse">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">{getExtractionMessage()}</p>
            </div>
          )}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-300",
              "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
              isExtracting && "pointer-events-none opacity-50"
            )}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-1">
              {t("reading.imageUpload.addMore")}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
            isDragging
              ? "drag-active border-primary scale-[1.02]"
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
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          {isExtracting ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                {extractionProgress && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                    {extractionProgress.current}/{extractionProgress.total}
                  </span>
                )}
              </div>
              <p className="text-lg font-medium loading-message">
                {getExtractionMessage()}
                <span className="loading-dots" />
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
