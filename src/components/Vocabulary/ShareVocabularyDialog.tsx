"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RecipientPicker } from "@/components/Internal/RecipientPicker";
import type { ShareTargetGroup } from "@/lib/shared-sessions";

interface ShareVocabularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWordIds: Set<string>;
  wordCount: number;
}

export default function ShareVocabularyDialog({
  open,
  onOpenChange,
  selectedWordIds,
  wordCount,
}: ShareVocabularyDialogProps) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<ShareTargetGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open) {
      setGroups([]);
      setSelectedIds(new Set());
      return;
    }
    setLoading(true);
    fetch("/api/shares/targets")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShareTargetGroup[]) => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleShare() {
    if (selectedWordIds.size === 0 || selectedIds.size === 0) return;
    setSharing(true);
    try {
      const res = await fetch("/api/vocabulary/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordIds: [...selectedWordIds],
          recipientIds: [...selectedIds],
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to share");
      }
      const data = await res.json();
      const msg =
        data.skipped > 0
          ? t("vocabulary.share.success", { count: data.inserted }) +
            " " +
            t("vocabulary.share.skipped", { count: data.skipped })
          : t("vocabulary.share.success", { count: data.inserted });
      toast.success(msg);
      onOpenChange(false);
    } catch {
      toast.error(t("vocabulary.share.error"));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("vocabulary.share.title")}</DialogTitle>
          <DialogDescription>
            {t("vocabulary.share.description", { count: wordCount })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("vocabulary.share.noTargets")}
          </div>
        ) : (
          <RecipientPicker
            groups={groups}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            searchPlaceholder={t("vocabulary.share.searchUsers")}
          />
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sharing}
          >
            {t("share.close")}
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing || selectedIds.size === 0 || loading}
          >
            {sharing
              ? t("vocabulary.share.sharing")
              : t("vocabulary.share.share")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
