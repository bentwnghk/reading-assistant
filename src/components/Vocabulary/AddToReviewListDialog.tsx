"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVocabularyStore } from "@/store/vocabulary";

interface AddToReviewListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddToReviewListDialog({
  open,
  onOpenChange,
}: AddToReviewListDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { selectedWordIds, words } = useVocabularyStore();

  const selectedWords = words.filter((w) => selectedWordIds.has(w.id));

  const handleSave = async () => {
    if (!name.trim() || selectedWords.length === 0) return;
    setSaving(true);
    try {
      const listWords = selectedWords.map((w) => ({
        word: w.word,
        syllabification: w.syllabification,
        partOfSpeech: w.partOfSpeech,
        englishDefinition: w.englishDefinition,
        chineseDefinition: w.chineseDefinition,
        example: w.example,
      }));
      const res = await fetch("/api/review-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), words: listWords }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        t("vocabulary.reviewLists.created", { count: selectedWords.length })
      );
      setName("");
      onOpenChange(false);
    } catch {
      toast.error(t("vocabulary.reviewLists.createError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("vocabulary.reviewLists.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("vocabulary.reviewLists.addDescription", {
              count: selectedWords.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              {t("vocabulary.reviewLists.listName")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vocabulary.reviewLists.listNamePlaceholder")}
              className="mt-1"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("vocabulary.reviewLists.preview")}
            </label>
            <ScrollArea className="max-h-48 mt-1 border rounded-md">
              <div className="p-2 space-y-1">
                {selectedWords.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted"
                  >
                    <span className="font-medium">{w.word}</span>
                    <span className="text-muted-foreground truncate flex-1">
                      {w.englishDefinition}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("share.close")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving || selectedWords.length === 0}
          >
            {saving
              ? t("vocabulary.reviewLists.saving")
              : t("vocabulary.reviewLists.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
