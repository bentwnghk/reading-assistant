"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookMarked, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TopicFormDialog from "@/components/LanguageCheck/TopicFormDialog";
import { useLanguageCheckStore } from "@/store/languageCheck";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { parseError } from "@/utils/error";

/**
 * Required "writing topic" step above the upload zone: pick a saved topic from
 * the Library or create one inline. Nothing can be uploaded without one.
 */
export default function TopicPicker() {
  const { t } = useTranslation();
  const topics = useLanguageCheckStore((s) => s.topics);
  const loadTopics = useLanguageCheckStore((s) => s.loadTopics);
  const selectedId = useLanguageCheckStore((s) => s.selectedTopicId);
  const select = useLanguageCheckStore((s) => s.selectTopic);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTopics().catch((e) => toast.error(parseError(e)));
  }, [loadTopics]);

  const selected = topics.find((x) => x.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BookMarked className="h-4 w-4" />
          {t("languageCheck.topics.picker.label")} *
        </span>
        <div className="w-full sm:w-72">
          <Select
            value={selected?.id ?? ""}
            onValueChange={(v) => select(v)}
            disabled={topics.length === 0}
          >
            <SelectTrigger aria-label={t("languageCheck.topics.picker.label")}>
              <SelectValue
                placeholder={
                  topics.length === 0
                    ? t("languageCheck.topics.picker.empty")
                    : t("languageCheck.topics.picker.placeholder")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("languageCheck.topics.new")}
        </Button>
      </div>
      {selected ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[selected.essayType].label}
          </span>
          {" · "}
          {selected.topic}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("languageCheck.topics.picker.required")}
        </p>
      )}
      <TopicFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(topic) => select(topic.id)}
      />
    </div>
  );
}
