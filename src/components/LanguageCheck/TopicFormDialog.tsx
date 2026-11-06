"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { downscaleImage, readFileAsDataURL } from "@/utils/image";
import { parseError } from "@/utils/error";
import {
  LANGUAGE_CHECK_ESSAY_TYPES,
  LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE,
  LANGUAGE_CHECK_MAX_IMAGE_CHARS,
  LANGUAGE_CHECK_MAX_TOPIC_CHARS,
  LANGUAGE_CHECK_MAX_TOPIC_TITLE_CHARS,
} from "@/constants/languageCheck";

interface TopicFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Topic being edited (lightweight); omit to create a new one. */
  topic?: LanguageCheckTopicSummary | null;
  onSaved?: (topic: LanguageCheckTopic) => void;
}

/** Create / edit a writing topic (title, full prompt, optional question image, essay type). */
export default function TopicFormDialog({
  open,
  onOpenChange,
  topic,
  onSaved,
}: TopicFormDialogProps) {
  const { t } = useTranslation();
  const saveTopic = useLanguageCheckStore((s) => s.saveTopic);
  const fetchTopic = useLanguageCheckStore((s) => s.fetchTopic);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [essayType, setEssayType] = useState<LanguageCheckEssayTypeId | "">("");
  const [image, setImage] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(topic?.title ?? "");
    setPrompt(topic?.topic ?? "");
    setEssayType(topic?.essayType ?? "");
    setImage("");
    if (topic?.hasQuestionImage) {
      let cancelled = false;
      setLoadingImage(true);
      fetchTopic(topic.id)
        .then((full) => {
          if (!cancelled) setImage(full.questionImage);
        })
        .catch((e) => toast.error(parseError(e)))
        .finally(() => {
          if (!cancelled) setLoadingImage(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [open, topic, fetchTopic]);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("languageCheck.topics.form.imageUnsupported"));
      return;
    }
    try {
      const source = await readFileAsDataURL(file);
      let out = await downscaleImage(source, 2000, 0.85);
      if (out.length > LANGUAGE_CHECK_MAX_IMAGE_CHARS) {
        out = await downscaleImage(source, 1400, 0.7);
      }
      if (out.length > LANGUAGE_CHECK_MAX_IMAGE_CHARS) {
        throw new Error(t("languageCheck.topics.form.imageTooLarge"));
      }
      setImage(out);
    } catch (error) {
      toast.error(parseError(error));
    }
  }

  const canSave =
    title.trim() !== "" && prompt.trim() !== "" && essayType !== "" && !loadingImage;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await saveTopic(
        {
          title: title.trim(),
          topic: prompt.trim(),
          essayType,
          questionImage: image,
        },
        topic?.id,
      );
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {topic
              ? t("languageCheck.topics.form.editTitle")
              : t("languageCheck.topics.form.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("languageCheck.topics.form.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-title">{t("languageCheck.topics.form.title")} *</Label>
            <Input
              id="topic-title"
              value={title}
              maxLength={LANGUAGE_CHECK_MAX_TOPIC_TITLE_CHARS}
              placeholder={t("languageCheck.topics.form.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-type">{t("languageCheck.topics.form.essayType")} *</Label>
            <Select
              value={essayType}
              onValueChange={(v) => setEssayType(v as LanguageCheckEssayTypeId)}
            >
              <SelectTrigger id="topic-type">
                <SelectValue placeholder={t("languageCheck.topics.form.essayTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_CHECK_ESSAY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-prompt">{t("languageCheck.topics.form.topic")} *</Label>
            <Textarea
              id="topic-prompt"
              value={prompt}
              rows={6}
              maxLength={LANGUAGE_CHECK_MAX_TOPIC_CHARS}
              placeholder={t("languageCheck.topics.form.topicPlaceholder")}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              {t("languageCheck.topics.form.image")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("languageCheck.topics.form.optional")})
              </span>
            </Label>
            {loadingImage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("languageCheck.topics.form.imageLoading")}
              </div>
            ) : image ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={t("languageCheck.topics.form.image")}
                  className="max-h-48 rounded-md border"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  title={t("languageCheck.topics.form.removeImage")}
                  onClick={() => setImage("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {t("languageCheck.topics.form.uploadImage")}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                void pickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {t("languageCheck.cancel")}
          </Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>
            {saving && <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("languageCheck.topics.form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
