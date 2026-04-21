"use client";

import { useEffect, useState, useCallback } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSharingStore } from "@/store/sharing";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { markLastOpenedSession } from "@/store/setting";
import type { SharedSession } from "@/lib/shared-sessions";
import type { ReadingStore } from "@/store/reading";

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

  return (
    <Dialog open={showSharedDialog} onOpenChange={setShowSharedDialog}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("share.pendingTitle")}</DialogTitle>
          <DialogDescription>
            {t("share.pendingDescription", {
              count: pendingShares.length,
            })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : pendingShares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("share.noPending")}
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-3 pr-3">
              {pendingShares.map((share) => (
                <div
                  key={share.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <p className="text-sm font-medium">
                    {t("share.sharedBy", { sender: share.senderName })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("share.sessionTitle", { title: share.docTitle })}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(share)}
                      disabled={processing !== null}
                    >
                      {processing === share.id
                        ? t("share.processing")
                        : t("share.accept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(share)}
                      disabled={processing !== null}
                    >
                      {processing === share.id
                        ? t("share.processing")
                        : t("share.decline")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {pendingShares.length > 1 && !loading && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeclineAll}
              disabled={processing !== null}
            >
              {t("share.declineAll")}
            </Button>
            <Button
              onClick={handleAcceptAll}
              disabled={processing !== null}
            >
              {t("share.acceptAll")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
