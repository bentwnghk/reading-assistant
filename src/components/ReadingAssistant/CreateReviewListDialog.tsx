"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useReadingStore } from "@/store/reading";

type IncludeChoice = "words" | "phrases" | "both";

interface CreateReviewListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single-word glossary entries (the Words tab). */
  words: GlossaryEntry[];
  /** Multi-word glossary entries (the Phrases tab). */
  phrases: GlossaryEntry[];
}

// Mirrors the entry_type rule used on sync (AGENTS.md Phrases): a whitespace-
// containing entry is a phrase, hyphenated compounds stay words.
function toReviewListWord(entry: GlossaryEntry): ReviewListWord {
  return {
    word: entry.word,
    syllabification: entry.syllabification || "",
    partOfSpeech: entry.partOfSpeech || "",
    englishDefinition: entry.englishDefinition || "",
    chineseDefinition: entry.chineseDefinition || "",
    example: entry.example || "",
    entryType: entry.word.trim().split(/\s+/).length > 1 ? "phrase" : "word",
  };
}

// Module-scope so the open-reset effect can depend on the stable props
// (words/phrases) rather than a per-render function identity.
function entriesFor(
  choice: IncludeChoice,
  words: GlossaryEntry[],
  phrases: GlossaryEntry[],
): GlossaryEntry[] {
  return choice === "words"
    ? words
    : choice === "phrases"
      ? phrases
      : [...words, ...phrases];
}

export default function CreateReviewListDialog({
  open,
  onOpenChange,
  words,
  phrases,
}: CreateReviewListDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [include, setInclude] = useState<IncludeChoice>("both");
  // Working set of previewed entries — the include choice's full contents,
  // minus whatever the user has removed with the per-row X buttons.
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset on open: default the name to the document title (the words come
  // from this text, so it is a sensible list name the user can override) and
  // preselect whichever entry types actually exist in the glossary.
  useEffect(() => {
    if (!open) return;
    setSaving(false);
    const initial: IncludeChoice =
      words.length > 0 && phrases.length > 0
        ? "both"
        : phrases.length > 0
          ? "phrases"
          : "words";
    setInclude(initial);
    setEntries(entriesFor(initial, words, phrases));
    setName(useReadingStore.getState().docTitle.trim().slice(0, 200));
  }, [open, words, phrases]);

  // Switching scope starts from that scope's full contents — removals are
  // per-choice and do not carry across radio changes.
  const handleIncludeChange = (value: string) => {
    const choice = value as IncludeChoice;
    setInclude(choice);
    setEntries(entriesFor(choice, words, phrases));
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || entries.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/review-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          words: entries.map(toReviewListWord),
        }),
      });
      if (res.status === 401) {
        toast.error(t("vocabulary.reviewLists.signInRequired"));
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success(
        t(
          include === "phrases"
            ? "vocabulary.reviewLists.createdPhrase"
            : include === "both"
              ? "vocabulary.reviewLists.createdItems"
              : "vocabulary.reviewLists.created",
          { count: entries.length },
        ),
      );
      onOpenChange(false);
    } catch {
      toast.error(t("vocabulary.reviewLists.createError"));
    } finally {
      setSaving(false);
    }
  };

  const options: { value: IncludeChoice; count: number; labelKey: string }[] = [
    { value: "words", count: words.length, labelKey: "vocabulary.reviewLists.includeWords" },
    { value: "phrases", count: phrases.length, labelKey: "vocabulary.reviewLists.includePhrases" },
    { value: "both", count: words.length + phrases.length, labelKey: "vocabulary.reviewLists.includeBoth" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("vocabulary.reviewLists.fromGlossaryTitle")}</DialogTitle>
          <DialogDescription>
            {t("vocabulary.reviewLists.fromGlossaryDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto px-1">
          <div>
            <label className="text-sm font-medium" htmlFor="review-list-name">
              {t("vocabulary.reviewLists.listName")}
            </label>
            <Input
              id="review-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vocabulary.reviewLists.listNamePlaceholder")}
              className="mt-1"
              maxLength={200}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">
              {t("vocabulary.reviewLists.includeLabel")}
            </Label>
            <RadioGroup
              value={include}
              onValueChange={handleIncludeChange}
              className="mt-2 gap-2"
            >
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 rounded-md border px-3 py-2"
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`include-${option.value}`}
                    disabled={option.count === 0}
                  />
                  <Label
                    htmlFor={`include-${option.value}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    {t(option.labelKey, { count: option.count })}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col min-h-0">
            <label className="text-sm font-medium text-muted-foreground mb-1">
              {t("vocabulary.reviewLists.preview")} ({entries.length})
            </label>
            <div className="border rounded-md overflow-hidden max-h-48 min-h-0 overflow-y-auto">
              <div className="divide-y">
                {entries.map((entry, i) => (
                  <div
                    key={`${entry.word}-${i}`}
                    className="flex items-center gap-2 text-sm py-2 px-3 hover:bg-muted min-w-0"
                  >
                    <span className="font-medium shrink-0">{entry.word}</span>
                    <span className="text-muted-foreground truncate min-w-0 flex-1">
                      {entry.chineseDefinition}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      title={t("vocabulary.reviewLists.removeItem")}
                      onClick={() => handleRemoveEntry(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {entries.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {t("vocabulary.reviewLists.previewEmpty")}
                  </div>
                )}
              </div>
            </div>
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
            disabled={!name.trim() || saving || entries.length === 0}
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
