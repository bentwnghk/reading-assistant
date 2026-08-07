"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // The app hydrated successfully, so clear the one-shot global-error reload
    // flag (see src/app/global-error.tsx). This lets a future error auto-reload
    // once again instead of being stuck on the manual recovery UI.
    try {
      sessionStorage.removeItem("__next_global_err_reloaded");
    } catch {}

    if (!("serviceWorker" in navigator)) return;

    // iOS Safari (unlike the installed PWA) restores a backgrounded tab from the
    // back/forward cache on relaunch — a frozen snapshot of the page that
    // bypasses both the network and the service worker. That snapshot is the old
    // build: its HTML references old JS chunk hashes still held in the SW's
    // immutable /_next/static cache, so the whole old UI resurfaces until a
    // manual reload. (This is why Cache-Control: no-store alone can't fix it —
    // bfcache ignores HTTP headers.) The installed PWA is unaffected because
    // every launch is a fresh navigation through the SW.
    //
    // Fix: force a service-worker update check on load and on bfcache restore
    // (bypassing the browser's 24h update throttle), then reload once when a
    // newly deployed SW takes over — so Safari tabs always land on the latest
    // build, matching the PWA. Guarded so the very first install (no prior
    // controller) doesn't trigger a reload.
    let reloading = false;
    const initialController = navigator.serviceWorker.controller;

    const onControllerChange = () => {
      const next = navigator.serviceWorker.controller;
      if (!initialController || !next || next === initialController || reloading) {
        return;
      }
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration("/").then((reg) => {
        void reg?.update().catch(() => {});
      });
    };
    // Proactively check on load (bypasses the browser's 24h SW-update throttle).
    checkForUpdate();

    // Re-check when a bfcache-frozen tab is restored to the foreground.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) checkForUpdate();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
