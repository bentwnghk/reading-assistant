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
import type { ReadingHistory } from "@/store/history";
import type { ShareTargetGroup } from "@/lib/shared-sessions";

interface ShareSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ReadingHistory | null;
}

export default function ShareSessionDialog({
  open,
  onOpenChange,
  session,
}: ShareSessionDialogProps) {
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
    if (!session || selectedIds.size === 0) return;
    setSharing(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          recipientIds: [...selectedIds],
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to share");
      }
      const data = await res.json();
      toast.success(t("share.success", { count: data.inserted }));
      onOpenChange(false);
    } catch {
      toast.error(t("share.error"));
    } finally {
      setSharing(false);
    }
  }

  const sessionTitle =
    session?.docTitle || session?.extractedText?.slice(0, 50) || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription className="truncate">
            {sessionTitle}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("share.noTargets")}
          </div>
        ) : (
          <RecipientPicker
            groups={groups}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
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
            {sharing ? t("share.sharing") : t("share.share")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
