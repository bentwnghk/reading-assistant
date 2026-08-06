"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePWAInstall } from "react-use-pwa-install";
import { Download, Share, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DISMISSED_KEY = "pwa-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua);
}

export default function PWAInstallPrompt() {
  const { t } = useTranslation();
  const canInstall = usePWAInstall();
  const [show, setShow] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    let dismissed = false;
    try {
      dismissed = !!sessionStorage.getItem(DISMISSED_KEY);
    } catch {}
    if (dismissed) return;

    if (canInstall) {
      setShow(true);
    } else if (isIOS() && !canInstall) {
      setShowIOS(true);
    }
  }, [canInstall]);

  const handleInstall = () => {
    if (canInstall) canInstall();
    setShow(false);
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setShow(false);
    setShowIOS(false);
  };

  if (isStandalone()) return null;

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t("pwa.installTitle")}
            </DialogTitle>
            <DialogDescription>{t("pwa.installDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleInstall} className="w-full">
              <Download className="h-4 w-4" />
              {t("pwa.installButton")}
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full">
              {t("pwa.dismiss")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIOS} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t("pwa.installTitle")}
            </DialogTitle>
            <DialogDescription>{t("pwa.iosDescription")}</DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 pt-2 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              <span className="flex items-center gap-1">
                {t("pwa.iosStep1")} <Share className="inline h-4 w-4 text-blue-500" />
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              <span className="flex items-center gap-1">
                {t("pwa.iosStep2")}{" "}
                <Plus className="inline h-4 w-4 text-blue-500" />
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              <span>{t("pwa.iosStep3")}</span>
            </li>
          </ol>
          <div className="pt-2">
            <Button variant="ghost" onClick={handleDismiss} className="w-full">
              {t("pwa.dismiss")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
