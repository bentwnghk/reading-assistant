"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { streamText, generateText } from "ai";
import { Upload, Image as ImageIcon, X, LoaderCircle, Globe, Building2, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/style";
import { useSettingStore } from "@/store/setting";
import { extractTextFromImagePrompt, getSystemPrompt } from "@/constants/readingPrompts";
import useModelProvider from "@/hooks/useAiProvider";
import { processPdfFile } from "@/utils/parser/pdfParser";

type TextVisibility = 'class' | 'school' | 'public'

interface TeacherClass {
  id: string;
  name: string;
}

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
  const { data: session } = useSession();
  const userRole = session?.user?.role || "student";
  const { visionModel: visionModelName, summaryModel } = useSettingStore();
  const { createModelProvider } = useModelProvider();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<TextVisibility>("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [images, setImages] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const extractedTextRef = useRef("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const isProcessing = phase !== "idle";

  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";
  const isSuperAdmin = userRole === "super-admin";

  const canSetSchool = isAdmin || isSuperAdmin;
  const canSetPublic = isSuperAdmin;

  const defaultVisibility = isTeacher ? "class" : "school";

  useEffect(() => {
    if (open && isTeacher) {
      setIsLoadingClasses(true);
      fetch("/api/classes")
        .then((r) => r.json())
        .then((data) => {
          setTeacherClasses(data || []);
        })
        .catch(() => {
          setTeacherClasses([]);
        })
        .finally(() => setIsLoadingClasses(false));
    }
  }, [open, isTeacher]);

  const reset = useCallback(() => {
    setName("");
    setVisibility(defaultVisibility);
    setSelectedClassId("all");
    setPhase("idle");
    setImages([]);
    extractedTextRef.current = "";
    setExtractedText("");
    setGeneratedTitle("");
    setProgress(null);
  }, [defaultVisibility]);

  const handleClose = () => {
    if (isProcessing) return;
    reset();
    onOpenChange(false);
  };

  const processImages = useCallback(
    async (imageDataUrls: string[]) => {
      if (imageDataUrls.length === 0) return;

      setPhase("extracting");
      setGeneratedTitle("");
      const dataURLs: string[] = [];
      let combinedText = extractedTextRef.current;

      try {
        for (let i = 0; i < imageDataUrls.length; i++) {
          setProgress({ current: i + 1, total: imageDataUrls.length });
          const dataURL = imageDataUrls[i];
          dataURLs.push(dataURL);

          const visionModel = await createModelProvider(visionModelName);
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
    async (fileList: FileList | File[]) => {
      const fileArray = Array.from(fileList);
      const imageFiles = fileArray.filter((f) => f.type.startsWith("image/"));
      const pdfFiles = fileArray.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );

      if (imageFiles.length === 0 && pdfFiles.length === 0) return;

      const allImageData: string[] = [];

      for (const pdfFile of pdfFiles) {
        try {
          const pdfImages = await processPdfFile(pdfFile);
          allImageData.push(...pdfImages);
        } catch (error) {
          console.error("PDF processing error:", error);
          toast.error(t("reading.repository.pdfError", { name: pdfFile.name }));
        }
      }

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const dataURL = await readFileAsDataURL(file);
          allImageData.push(dataURL);
        }
      }

      if (allImageData.length > 0) {
        processImages(allImageData);
      }
    },
    [processImages, t]
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
          visibility,
          classId: selectedClassId !== "all" ? selectedClassId : null,
          images,
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      const { id, visibility: actualVisibility, classId: actualClassId } = await res.json();
      toast.success(t("reading.repository.uploadSuccess"));

      const selectedClass = teacherClasses.find(c => c.id === actualClassId);

      const newItem: RepositoryTextListItem = {
        id,
        name: name.trim(),
        title: generatedTitle,
        previewText: extractedText.slice(0, 200),
        imageCount: images.length,
        schoolId: null,
        schoolName: null,
        classId: actualClassId || null,
        className: selectedClass?.name || null,
        visibility: actualVisibility || visibility,
        createdBy: session?.user?.id || "",
        createdByName: session?.user?.name || null,
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
                accept="image/*,.pdf,application/pdf"
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

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {visibility === "public" ? (
                  <Globe className="h-4 w-4 text-blue-500" />
                ) : visibility === "school" ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                {t("reading.repository.visibility")}
              </div>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as TextVisibility)}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t("reading.repository.visibilityClass")}
                    </div>
                  </SelectItem>
                  {canSetSchool && (
                    <SelectItem value="school">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {t("reading.repository.visibilitySchool")}
                      </div>
                    </SelectItem>
                  )}
                  {canSetPublic && (
                    <SelectItem value="public">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {t("reading.repository.visibilityPublic")}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {visibility === "public" 
                ? t("reading.repository.visibilityPublicHint")
                : visibility === "school"
                  ? t("reading.repository.visibilitySchoolHint")
                  : t("reading.repository.visibilityClassHint")}
            </p>

            {isTeacher && visibility === "class" && (
              <div className="pt-2 border-t">
                <Label className="text-sm font-medium mb-1.5 block">
                  {t("reading.repository.selectClass")}
                </Label>
                {isLoadingClasses ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("reading.repository.loadingClasses")}</span>
                  </div>
                ) : (
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("reading.repository.allMyClasses")}
                      </SelectItem>
                      {teacherClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedClassId === "all"
                    ? t("reading.repository.selectClassAllHint")
                    : t("reading.repository.selectClassHint")}
                </p>
              </div>
            )}
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
