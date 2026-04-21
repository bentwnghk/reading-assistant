"use client";

import { useEffect, useState, useCallback } from "react";
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
  BookOpen,
  ArrowRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { useSharingStore } from "@/store/sharing";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { markLastOpenedSession } from "@/store/setting";
import type { SharedSession } from "@/lib/shared-sessions";
import type { ReadingStore } from "@/store/reading";

const CARD_COLOR = "blue";

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-500",
};

const COLOR_GLOW: Record<string, string> = {
  blue: "shadow-blue-400/50",
};

const COLOR_TEXT: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-300",
};

const COLOR_BORDER: Record<string, string> = {
  blue: "border-blue-500/20",
};

export default function SharedSessionDialog() {
  const { t } = useTranslation();
  const {
    pendingShares,
    showSharedDialog,
    setShowSharedDialog,
    setPendingShares,
  } = useSharingStore();
  const { backup, restore, reset } = useReadingStore();
  const { update } = useHistoryStore();
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showSharedDialog) return;
    setLoading(true);
    fetch("/api/shares")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SharedSession[]) => {
        setPendingShares(data);
        if (data.length === 0) {
          setShowSharedDialog(false);
        }
      })
      .catch(() => {
        setPendingShares([]);
        setShowSharedDialog(false);
      })
      .finally(() => setLoading(false));
  }, [showSharedDialog, setPendingShares, setShowSharedDialog]);

  const handleAccept = useCallback(
    async (share: SharedSession) => {
      setProcessing(share.id);
      try {
        const res = await fetch(`/api/shares/${share.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });
        if (!res.ok) {
          throw new Error("Failed to accept");
        }
        const data = await res.json();
        const newSession: ReadingStore = data.session;

        const { id: currentId } = useReadingStore.getState();
        if (currentId) {
          update(currentId, backup());
        }
        reset();
        await restore(newSession);
        markLastOpenedSession(newSession.id);

        setPendingShares((prev) =>
          prev.filter((s) => s.id !== share.id)
        );
        toast.success(t("share.acceptSuccess"));

        if (pendingShares.length <= 1) {
          setShowSharedDialog(false);
        }
      } catch {
        toast.error(t("share.error"));
      } finally {
        setProcessing(null);
      }
    },
    [backup, restore, reset, update, pendingShares.length, setPendingShares, setShowSharedDialog, t]
  );

  const handleReject = useCallback(
    async (share: SharedSession) => {
      setProcessing(share.id);
      try {
        const res = await fetch(`/api/shares/${share.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });
        if (!res.ok) {
          throw new Error("Failed to reject");
        }
        setPendingShares((prev) =>
          prev.filter((s) => s.id !== share.id)
        );
        if (pendingShares.length <= 1) {
          setShowSharedDialog(false);
        }
      } catch {
        toast.error(t("share.error"));
      } finally {
        setProcessing(null);
      }
    },
    [pendingShares.length, setPendingShares, setShowSharedDialog, t]
  );

  const handleAcceptAll = useCallback(async () => {
    for (const share of pendingShares) {
      await handleAccept(share);
    }
  }, [pendingShares, handleAccept]);

  const handleDeclineAll = useCallback(async () => {
    for (const share of pendingShares) {
      await handleReject(share);
    }
  }, [pendingShares, handleReject]);

  const handleClose = useCallback(() => {
    setShowSharedDialog(false);
  }, [setShowSharedDialog]);

  return (
    <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
      <DialogContent className="max-w-sm text-center overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            COLOR_BG[CARD_COLOR] ?? "bg-primary"
          )}
        />
        <VisuallyHidden>
          <DialogTitle>{t("share.pendingTitle")}</DialogTitle>
        </VisuallyHidden>

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <LoaderCircle className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">
              {t("share.processing")}
            </p>
          </div>
        ) : pendingShares.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm text-muted-foreground">
              {t("share.noPending")}
            </p>
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
                <Share2 className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("share.pendingTitle")}
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-foreground/80">
                {t("share.pendingDescription", {
                  count: pendingShares.length,
                })}
              </DialogDescription>
            </div>

            <ScrollArea className="w-full max-h-64">
              <div className="space-y-2 pr-3">
                {pendingShares.map((share) => (
                  <div
                    key={share.id}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      COLOR_BORDER[CARD_COLOR] ?? "",
                      "bg-background/60 backdrop-blur-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <BookOpen
                        className={cn(
                          "w-5 h-5 mt-0.5 shrink-0",
                          COLOR_TEXT[CARD_COLOR] ?? "text-primary"
                        )}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {share.docTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("share.sharedBy", { sender: share.senderName })}
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

            {pendingShares.length > 1 && (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  className="w-full text-white font-semibold gap-2 bg-blue-500 hover:bg-blue-600"
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
