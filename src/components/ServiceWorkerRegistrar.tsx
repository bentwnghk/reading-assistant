"use client";

import { useEffect } from "react";

// Build marker this bundle was compiled with (inlined via next.config env).
// The server exposes its own copy through /api/config; if they differ, this
// page is an outdated cached copy and must be reloaded to get the latest build.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";
const BUILD_CHECK_KEY = "__proreader_build_reloaded";

async function reloadIfStale() {
  // One-shot guard per session so a genuinely broken deployment can't loop.
  try {
    if (sessionStorage.getItem(BUILD_CHECK_KEY) === "1") return;
  } catch {}

  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { buildId?: string };
    if (data.buildId && data.buildId !== BUILD_ID) {
      try {
        sessionStorage.setItem(BUILD_CHECK_KEY, "1");
      } catch {}
      window.location.reload();
    }
  } catch {
    // Network unavailable (offline, or iOS Safari suspends the network while a
    // tab is restored) — keep showing the cached page; a manual reload works.
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // The app hydrated successfully, so clear the one-shot global-error reload
    // flag (see src/app/global-error.tsx). This lets a future error auto-reload
    // once again instead of being stuck on the manual recovery UI.
    try {
      sessionStorage.removeItem("__next_global_err_reloaded");
    } catch {}

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});

      // When a new service worker (from a fresh deploy) takes control of an
      // already-controlled page, reload immediately so the user gets the new
      // build instead of the old cached code. Skipped on first visit (no
      // controller yet) so a brand-new user is not reloaded.
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      }
    }

    // iOS Safari restores open tabs on browser relaunch from a frozen page
    // snapshot (WebKit page cache) that bypasses the network, the service
    // worker, and HTTP Cache-Control — so a deployed update (e.g. an edited
    // landing-page mockup) is not visible until the user reloads. Compare the
    // build ID this page was compiled with against the server's current build
    // ID and reload when stale. Runs on mount (covers the fresh-but-stale load
    // iOS performs on tab restore) and on bfcache restore (pageshow persisted).
    void reloadIfStale();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void reloadIfStale();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
