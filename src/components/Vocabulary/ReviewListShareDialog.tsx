"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/style";
import {
  Share2,
  ListChecks,
  ArrowRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { useVocabularyStore } from "@/store/vocabulary";

const CARD_COLOR = "indigo";

const COLOR_BG: Record<string, string> = {
  indigo: "bg-indigo-500",
};

const COLOR_GLOW: Record<string, string> = {
  indigo: "shadow-indigo-400/50",
};

const COLOR_TEXT: Record<string, string> = {
  indigo: "text-indigo-600 dark:text-indigo-300",
};

const COLOR_BORDER: Record<string, string> = {
  indigo: "border-indigo-500/20",
};

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
  const [processing, setProcessing] = useState<string | null>(null);

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
      setProcessing(share.id);
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
        setProcessing(null);
      }
    },
    [setPendingReviewListShares, loadReviewListIntoQueue, setShowReviewListShareDialog, t]
  );

  const handleReject = useCallback(
    async (share: SharedReviewList) => {
      setProcessing(share.id);
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
        if (useVocabularyStore.getState().pendingReviewListShares.length === 0) {
          setShowReviewListShareDialog(false);
        }
      } catch {
        toast.error(t("vocabulary.reviewLists.rejectError"));
      } finally {
        setProcessing(null);
      }
    },
    [setPendingReviewListShares, setShowReviewListShareDialog, t]
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
  }, [pendingReviewListShares, handleReject]);

  const handleClose = useCallback(() => {
    setShowReviewListShareDialog(false);
  }, [setShowReviewListShareDialog]);

  return (
    <Dialog
      open={showReviewListShareDialog}
      onOpenChange={setShowReviewListShareDialog}
    >
      <DialogContent className="max-w-sm text-center overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            COLOR_BG[CARD_COLOR] ?? "bg-primary"
          )}
        />
        <VisuallyHidden>
          <DialogTitle>{t("vocabulary.reviewLists.pendingTitle")}</DialogTitle>
        </VisuallyHidden>

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground">
              {t("share.processing")}
            </p>
          </div>
        ) : pendingReviewListShares.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative flex items-center justify-center">
              <div className={cn(
                "absolute w-20 h-20 rounded-full opacity-20 blur-xl",
                COLOR_BG[CARD_COLOR] ?? "bg-primary"
              )} />
              <div className={cn(
                "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                COLOR_BG[CARD_COLOR] ?? "bg-primary",
                COLOR_GLOW[CARD_COLOR] ?? ""
              )}>
                <Share2 className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("vocabulary.reviewLists.pendingTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("share.noPending")}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClose}
            >
              {t("share.close")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-4 pb-2">
            <div className="relative flex items-center justify-center">
              <div className={cn(
                "absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse",
                COLOR_BG[CARD_COLOR] ?? "bg-primary"
              )} />
              <div className={cn(
                "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                COLOR_BG[CARD_COLOR] ?? "bg-primary",
                COLOR_GLOW[CARD_COLOR] ?? ""
              )}>
                <ListChecks className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("vocabulary.reviewLists.pendingTitle")}
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-foreground/80">
                {t("vocabulary.reviewLists.pendingDescription", {
                  count: pendingReviewListShares.length,
                })}
              </DialogDescription>
            </div>

            <ScrollArea className="w-full max-h-64">
              <div className="space-y-2 pr-3">
                {pendingReviewListShares.map((share) => (
                  <div
                    key={share.id}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      COLOR_BORDER[CARD_COLOR] ?? "",
                      "bg-background/60 backdrop-blur-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ListChecks
                        className={cn(
                          "w-5 h-5 mt-0.5 shrink-0",
                          COLOR_TEXT[CARD_COLOR] ?? "text-primary"
                        )}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">
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
                    <div className="flex items-center gap-2 mt-3 ml-8">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleAccept(share)}
                        disabled={processing !== null}
                      >
                        {processing === share.id ? (
                          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        {processing === share.id
                          ? t("share.processing")
                          : t("share.accept")}
                      </Button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => handleReject(share)}
                        disabled={processing !== null}
                      >
                        <X className="w-3.5 h-3.5" />
                        {t("share.decline")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {pendingReviewListShares.length > 1 && (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  className="w-full text-white font-semibold gap-2 bg-indigo-500 hover:bg-indigo-600"
                  onClick={handleAcceptAll}
                  disabled={processing !== null}
                >
                  {t("share.acceptAll")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleDeclineAll}
                  disabled={processing !== null}
                >
                  {t("share.declineAll")}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClose}
            >
              {t("share.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReviewListShareDialog;
