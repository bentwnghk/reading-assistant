"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, Check, X } from "lucide-react";
import { useVocabularyStore } from "@/store/vocabulary";

function ReviewListShareDialog() {
  const { t } = useTranslation();
  const {
    showReviewListShareDialog,
    setShowReviewListShareDialog,
    pendingReviewListShares,
    setPendingReviewListShares,
    loadReviewListIntoQueue,
  } = useVocabularyStore();
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!showReviewListShareDialog) return;
    setLoading(true);
    fetch("/api/review-lists/share/pending")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SharedReviewList[]) =>
        setPendingReviewListShares(data)
      )
      .catch(() => setPendingReviewListShares([]))
      .finally(() => setLoading(false));
  }, [showReviewListShareDialog, setPendingReviewListShares]);

  const handleAccept = useCallback(
    async (share: SharedReviewList) => {
      setProcessingId(share.id);
      try {
        const res = await fetch(`/api/review-lists/share/${share.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const words: ReviewListWord[] = data.words;

        setPendingReviewListShares((prev) =>
          prev.filter((s) => s.id !== share.id)
        );
        toast.success(t("vocabulary.reviewLists.acceptSuccess"));

        if (words && words.length > 0) {
          loadReviewListIntoQueue(words);
          setShowReviewListShareDialog(false);
        }
      } catch {
        toast.error(t("vocabulary.reviewLists.acceptError"));
      } finally {
        setProcessingId(null);
      }
    },
    [setPendingReviewListShares, loadReviewListIntoQueue, setShowReviewListShareDialog, t]
  );

  const handleReject = useCallback(
    async (share: SharedReviewList) => {
      setProcessingId(share.id);
      try {
        const res = await fetch(`/api/review-lists/share/${share.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });
        if (!res.ok) throw new Error();
        setPendingReviewListShares((prev) =>
          prev.filter((s) => s.id !== share.id)
        );
      } catch {
        toast.error(t("vocabulary.reviewLists.rejectError"));
      } finally {
        setProcessingId(null);
      }
    },
    [setPendingReviewListShares, t]
  );

  const handleAcceptAll = useCallback(async () => {
    for (const share of pendingReviewListShares) {
      await handleAccept(share);
    }
  }, [pendingReviewListShares, handleAccept]);

  const handleDeclineAll = useCallback(async () => {
    for (const share of pendingReviewListShares) {
      await handleReject(share);
    }
    if (pendingReviewListShares.length > 0) {
      setShowReviewListShareDialog(false);
    }
  }, [pendingReviewListShares, handleReject, setShowReviewListShareDialog]);

  useEffect(() => {
    if (
      showReviewListShareDialog &&
      !loading &&
      pendingReviewListShares.length === 0
    ) {
      setShowReviewListShareDialog(false);
    }
  }, [showReviewListShareDialog, loading, pendingReviewListShares.length, setShowReviewListShareDialog]);

  return (
    <Dialog
      open={showReviewListShareDialog}
      onOpenChange={setShowReviewListShareDialog}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("vocabulary.reviewLists.pendingTitle")}
          </DialogTitle>
          <DialogDescription>
            {pendingReviewListShares.length > 0
              ? t("vocabulary.reviewLists.pendingDescription", {
                  count: pendingReviewListShares.length,
                })
              : t("share.noPending")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {pendingReviewListShares.length > 1 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcceptAll}
                  disabled={!!processingId}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t("share.acceptAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineAll}
                  disabled={!!processingId}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t("share.declineAll")}
                </Button>
              </div>
            )}

            <ScrollArea className="max-h-80">
              <div className="space-y-3 pr-3">
                {pendingReviewListShares.map((share) => (
                  <div
                    key={share.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <ListChecks className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {share.reviewListName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("vocabulary.reviewLists.shareMessage", {
                            sender: share.senderName,
                            count: share.wordCount,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(share)}
                        disabled={processingId === share.id}
                      >
                        {t("share.decline")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(share)}
                        disabled={processingId === share.id}
                      >
                        {processingId === share.id
                          ? t("share.processing")
                          : t("share.accept")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReviewListShareDialog;
