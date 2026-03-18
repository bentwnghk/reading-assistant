"use client";
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { streamText, generateText } from "ai";
import { Upload, Image as ImageIcon, X, LoaderCircle, Globe, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/style";
import { useSettingStore } from "@/store/setting";
import { extractTextFromImagePrompt, getSystemPrompt } from "@/constants/readingPrompts";
import useModelProvider from "@/hooks/useAiProvider";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface RepositoryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (item: RepositoryTextListItem) => void;
}

type Phase = "idle" | "extracting" | "generating-title" | "saving";

function RepositoryUploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: RepositoryUploadDialogProps) {
  const { t } = useTranslation();
  const { visionModel: visionModelName, summaryModel } = useSettingStore();
  const { createModelProvider } = useModelProvider();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Upload state
  const [phase, setPhase] = useState<Phase>("idle");
  const [images, setImages] = useState<string[]>([]); // base64 data URLs
  const [extractedText, setExtractedText] = useState("");
  const extractedTextRef = useRef("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const isProcessing = phase !== "idle";

  const reset = useCallback(() => {
    setName("");
    setIsPublic(false);
    setPhase("idle");
    setImages([]);
    extractedTextRef.current = "";
    setExtractedText("");
    setGeneratedTitle("");
    setProgress(null);
  }, []);

  const handleClose = () => {
    if (isProcessing) return;
    reset();
    onOpenChange(false);
  };

  const processImages = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      setPhase("extracting");
      setGeneratedTitle("");
      const dataURLs: string[] = [];
      // Seed with any text already extracted from previous uploads
      let combinedText = extractedTextRef.current;

      try {
        const visionModel = await createModelProvider(visionModelName);

        for (let i = 0; i < imageFiles.length; i++) {
          setProgress({ current: i + 1, total: imageFiles.length });
          const dataURL = await readFileAsDataURL(imageFiles[i]);
          dataURLs.push(dataURL);

          const result = streamText({
            model: visionModel,
            system: getSystemPrompt(),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: extractTextFromImagePrompt() },
                  { type: "image", image: dataURL },
                ],
              },
            ],
          });

          if (combinedText) combinedText += "\n\n";
          for await (const part of result.textStream) {
            combinedText += part;
            extractedTextRef.current = combinedText;
            setExtractedText(combinedText);
          }
        }

        setImages((prev) => [...prev, ...dataURLs]);
        setProgress(null);

        // Generate title
        setPhase("generating-title");
        try {
          const titleModel = await createModelProvider(summaryModel);
          const { text: llmTitle } = await generateText({
            model: titleModel,
            prompt: `You are a helpful assistant. Read the following text and reply with ONLY a concise, descriptive title for it (5–10 words, no punctuation at the end, no quotation marks).\n\n${combinedText.slice(0, 2000)}`,
          });
          const cleaned = llmTitle.trim().replace(/^["'""'']|["'""'']$/g, "");
          setGeneratedTitle(cleaned);
        } catch {
          // Title generation is non-critical; use first line as fallback
          const fallback = combinedText.split(/\n/).find((l) => l.trim()) ?? "";
          setGeneratedTitle(fallback.slice(0, 80));
        }

        setPhase("idle");
      } catch (error) {
        console.error("Extraction error:", error);
        toast.error(t("reading.repository.uploadError"));
        setPhase("idle");
        setProgress(null);
      }
    },
    [createModelProvider, visionModelName, summaryModel, t]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      processImages(files);
    },
    [processImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("reading.repository.nameRequired"));
      return;
    }
    if (!extractedText) return;

    setPhase("saving");
    try {
      const res = await fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: generatedTitle,
          extractedText,
          isPublic,
          images,
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      const { id } = await res.json();
      toast.success(t("reading.repository.uploadSuccess"));

      const newItem: RepositoryTextListItem = {
        id,
        name: name.trim(),
        title: generatedTitle,
        previewText: extractedText.slice(0, 200),
        imageCount: images.length,
        schoolId: null,
        schoolName: null,
        isPublic,
        createdBy: "",
        createdByName: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onUploaded(newItem);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("reading.repository.uploadError"));
    } finally {
      setPhase("idle");
    }
  };

  const hasContent = extractedText.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reading.repository.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("reading.repository.uploadDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-name">{t("reading.repository.name")}</Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("reading.repository.namePlaceholder")}
              disabled={isProcessing}
            />
          </div>

          {/* Image drop zone */}
          <div className="space-y-2">
            <Label>{t("reading.imageUpload.tabUpload")}</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                isProcessing && "pointer-events-none opacity-50"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {phase === "extracting" ? (
                <div className="flex flex-col items-center gap-2">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">
                    {progress
                      ? t("reading.repository.uploadingProgress", {
                          current: progress.current,
                          total: progress.total,
                        })
                      : t("reading.repository.uploading")}
                  </p>
                </div>
              ) : phase === "generating-title" ? (
                <div className="flex flex-col items-center gap-2">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">
                    {t("reading.repository.generatingTitle")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-muted">
                    {isDragging ? (
                      <ImageIcon className="h-7 w-7 text-primary" />
                    ) : (
                      <Upload className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {images.length > 0
                      ? t("reading.imageUpload.addMore")
                      : t("reading.imageUpload.dropHere")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("reading.imageUpload.supportedFormats")}
                  </p>
                </div>
              )}
            </div>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`Image ${i + 1}`}
                      className="h-16 w-16 object-cover rounded border"
                    />
                    <button
                      type="button"
                      disabled={isProcessing}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted text — editable */}
          {hasContent && (
            <div className="space-y-1.5">
              <Label htmlFor="repo-extracted-text">
                {t("reading.extractedText.title")}
              </Label>
              <Textarea
                id="repo-extracted-text"
                value={extractedText}
                onChange={(e) => {
                  setExtractedText(e.target.value);
                  extractedTextRef.current = e.target.value;
                }}
                disabled={isProcessing}
                className="min-h-[120px] max-h-60 resize-y text-xs leading-relaxed"
              />
              {generatedTitle && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">
                    {t("reading.imageUpload.title")}:{" "}
                  </span>
                  {generatedTitle}
                </p>
              )}
            </div>
          )}

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-blue-500" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                {t("reading.repository.isPublic")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reading.repository.isPublicHint")}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isProcessing}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {t("reading.repository.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing || !hasContent || !name.trim()}
          >
            {phase === "saving" ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin mr-1.5" />
                {t("reading.repository.saving")}
              </>
            ) : (
              t("reading.repository.saveToRepo")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RepositoryUploadDialog;
