"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LoaderCircle, Trash2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useVocabularyStore } from "@/store/vocabulary";

interface DeleteWordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Real user_vocabulary ids to soft-delete (caller filters entry type). */
  ids: string[];
  entryType?: "word" | "phrase";
}

/**
 * Confirmation dialog for removing selected words/phrases from My
 * Vocabulary. Deletion is a soft delete server-side (hidden_at tombstone):
 * rows keep their SRS history and are re-collected if the user meets the
 * word in a new reading session or accepts it from a shared list again.
 */
export default function DeleteWordsDialog({
  open,
  onOpenChange,
  ids,
  entryType = "word",
}: DeleteWordsDialogProps) {
  const { t } = useTranslation();
  const isPhrase = entryType === "phrase";
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const deleted = await useVocabularyStore.getState().deleteWords(ids);
      toast.success(
        t(
          isPhrase
            ? "vocabulary.deleteDialog.successPhrases"
            : "vocabulary.deleteDialog.successWords",
          { count: deleted }
        )
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete words:", error);
      toast.error(t("vocabulary.deleteDialog.error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("vocabulary.deleteDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t(
              isPhrase
                ? "vocabulary.deleteDialog.descriptionPhrases"
                : "vocabulary.deleteDialog.descriptionWords",
              { count: ids.length }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t("vocabulary.deleteDialog.note")}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            {t("vocabulary.deleteDialog.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || ids.length === 0}
          >
            {deleting && (
              <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("vocabulary.deleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
