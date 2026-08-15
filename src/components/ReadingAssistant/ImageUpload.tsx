 "use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, LoaderCircle, X, Plus, Maximize2, Library, ScanText, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";
import { processPdfFile } from "@/utils/parser/pdfParser";
import dynamic from "next/dynamic";

const TextRepository = dynamic(
  () => import("@/components/ReadingAssistant/TextRepository"),
  { ssr: false }
);

const AiTextGenerator = dynamic(
  () => import("@/components/ReadingAssistant/AiTextGenerator"),
  { ssr: false }
);

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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number } | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "repository" | "ai-generate">("upload");
  const { originalImages, extractedText, activeGenerations, docTitle, source } = useReadingStore();
  const { extractTextFromImage, generateTitle } = useReadingAssistant();
  const isExtracting = !!activeGenerations["extracting"];
  const isBusy = isExtracting || isProcessingPdf;
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Acquire a Screen Wake Lock while extracting to prevent iOS from suspending
  // the page (which would kill the in-flight streaming request and leave the
  // extracted text incomplete). The lock is released when extraction finishes.
  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Wake Lock is a best-effort API; ignore failures silently.
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire the wake lock if the page becomes visible again while still
  // extracting (iOS may release it automatically on visibilitychange).
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isBusy) {
        await acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isBusy, acquireWakeLock]);

  // Allow the Welcome Back dialog (and other callers) to route the user
  // straight into the AI Text Generator tab by dispatching a custom event.
  useEffect(() => {
    const handler = () => setActiveTab("ai-generate");
    window.addEventListener("open-ai-text-generator", handler);
    return () => window.removeEventListener("open-ai-text-generator", handler);
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) => file.type.startsWith("image/"));
      const pdfFiles = fileArray.filter(
        (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      );

      if (imageFiles.length === 0 && pdfFiles.length === 0) return;

      const totalFiles = imageFiles.length + pdfFiles.length;
      setExtractionProgress({ current: 1, total: totalFiles });
      await acquireWakeLock();

      try {
        let currentFile = 0;

        for (const pdfFile of pdfFiles) {
          currentFile++;
          setExtractionProgress({ current: currentFile, total: totalFiles });
          setIsProcessingPdf(true);

          const images = await processPdfFile(pdfFile);
          setIsProcessingPdf(false);

          for (const imageData of images) {
            await extractTextFromImage(imageData);
          }
        }

        for (const imageFile of imageFiles) {
          currentFile++;
          setExtractionProgress({ current: currentFile, total: totalFiles });
          const imageData = await readFileAsDataURL(imageFile);
          await extractTextFromImage(imageData);
        }

        await generateTitle();
      } finally {
        setExtractionProgress(null);
        setIsProcessingPdf(false);
        await releaseWakeLock();
      }
    },
    [extractTextFromImage, generateTitle, acquireWakeLock, releaseWakeLock]
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

  // Accept pasted images/PDFs (screenshots, browser "Copy image", or files
  // copied from the OS file manager) while the Upload tab is active. Text
  // pastes and non-supported clipboard files are left to their default
  // behavior.
  useEffect(() => {
    if (activeTab !== "upload") return;
    const handlePaste = (e: ClipboardEvent) => {
      if (isBusy) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      const supported = files.filter(
        (file) =>
          file.type.startsWith("image/") ||
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
      );
      if (supported.length === 0) return;
      e.preventDefault();
      handleFiles(supported);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab, isBusy, handleFiles]);

  const clearImage = (index: number) => {
    useReadingStore.getState().removeOriginalImage(index);
  };

  const clearAllImages = () => {
    useReadingStore.getState().reset();
  };

  const getExtractionMessage = () => {
    if (isProcessingPdf) return t("reading.imageUpload.processingPdf");
    if (!extractionProgress) return t("reading.imageUpload.extracting");
    return t("reading.imageUpload.extractingProgress", {
      current: extractionProgress.current,
      total: extractionProgress.total,
    });
  };

  const hasContent = originalImages.length > 0 || !!extractedText;

  // For text-only sources (AI-generated, text-only Repository) the title is
  // prepended as the first paragraph of extractedText. Strip it from the
  // preview so the title isn't shown twice (once in the card heading, once in
  // the preview body).
  const previewText = (() => {
    if (!extractedText) return "";
    const parts = extractedText.split("\n\n");
    const startIdx = docTitle && parts[0]?.trim() === docTitle.trim() ? 1 : 0;
    return parts.slice(startIdx).join("\n\n");
  })();

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          {t("reading.imageUpload.title")}
          <GuideDialog
            titleKey="reading.imageUpload.help.title"
            introKey="reading.imageUpload.help.intro"
            itemsBaseKey="reading.imageUpload.help.items"
            items={[
              { key: "upload", icon: Upload, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
              { key: "extract", icon: ScanText, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "repository", icon: Library, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
              { key: "aiGenerate", icon: Sparkles, bgClass: "bg-violet-500/10", iconClass: "text-violet-500" },
            ]}
            stepsTitleKey="reading.imageUpload.help.stepsTitle"
            stepsKeys={[
              "reading.imageUpload.help.steps.s1",
              "reading.imageUpload.help.steps.s2",
              "reading.imageUpload.help.steps.s3",
            ]}
            tipTitleKey="reading.imageUpload.help.tipTitle"
            tipContentKey="reading.imageUpload.help.tipContent"
          />
        </h3>
        <div className="flex items-center gap-2">
          {hasContent && (
            <Button variant="outline" size="sm" onClick={clearAllImages}>
              <Plus className="h-4 w-4 mr-1" />
              {t("reading.imageUpload.clearAll")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "repository")}>
        <TabsList className="mb-4 w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="upload" className="gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {t("reading.imageUpload.tabUpload")}
          </TabsTrigger>
          <TabsTrigger value="repository" className="gap-1">
            <Library className="h-3.5 w-3.5" />
            {t("reading.imageUpload.tabRepository")}
          </TabsTrigger>
          <TabsTrigger value="ai-generate" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t("reading.imageUpload.tabAiGenerate")}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Upload Image ── */}
        <TabsContent value="upload">
          {originalImages.length > 0 && extractedText ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {originalImages.map((image, index) => (
                  <div key={index} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`Uploaded ${index + 1}`}
                      className="max-h-40 rounded-lg border object-contain"
                    />
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 bg-green-100 dark:bg-secondary hover:bg-green-200 dark:hover:bg-secondary/80 text-green-800 dark:text-green-200"
                        title={t("reading.imageUpload.openInNewTab")}
                        onClick={() => router.push(`/image-viewer?index=${index}`)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => clearImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("reading.imageUpload.uploadNew")}
              </p>
              {isBusy && (
                <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">{getExtractionMessage()}</p>
                </div>
              )}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                  isBusy && "pointer-events-none opacity-50"
                )}
                onClick={handleClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
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
          ) : extractedText ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                <div className="shrink-0 rounded-lg bg-muted p-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm truncate">
                      {docTitle || t("reading.imageUpload.untitled")}
                    </h4>
                    {source === "ai-generated" && (
                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 gap-1">
                        <Sparkles className="h-3 w-3" />
                        {t("reading.imageUpload.aiGeneratedBadge")}
                      </Badge>
                    )}
                    {source === "repository" && (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 gap-1">
                        <Library className="h-3 w-3" />
                        {t("reading.imageUpload.repositoryBadge")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                    {previewText.slice(0, 300)}
                    {previewText.length > 300 ? "…" : ""}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
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
                isBusy && "pointer-events-none opacity-50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />

              {isBusy ? (
                <div className="flex flex-col items-center gap-2">
                  <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">
                    {getExtractionMessage()}
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
              <p className="text-xs text-muted-foreground">
                {t("reading.imageUpload.pasteHint")}
              </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Text Repository ── */}
        <TabsContent value="repository">
          <TextRepository onTextLoaded={() => setActiveTab("upload")} />
        </TabsContent>

        {/* ── Tab: AI Text Generator ── */}
        <TabsContent value="ai-generate">
          <AiTextGenerator onTextLoaded={() => setActiveTab("upload")} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default ImageUpload;
