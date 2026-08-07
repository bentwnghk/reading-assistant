"use client";

import { useEffect } from "react";

// Build marker this bundle was compiled with (inlined via next.config env).
// The server exposes its own copy through /api/config; if they differ, this
// page is an outdated cached copy and must be reloaded to get the latest build.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";
const BUILD_CHECK_KEY = "__proreader_build_reloaded";

const FETCH_TIMEOUT_MS = 6000;
const RETRY_MS = 10000;
const MAX_TIMER_RETRIES = 18; // ~3 minutes of timer-driven retries per visibility period

let timerRetries = 0;
let lastCheckAt = 0;

async function checkStaleBuild(): Promise<"reload" | "match" | "unavailable"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("/api/config", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.status === 404) return "match"; // no /api/config (static export)
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { buildId?: string };
    return data.buildId && data.buildId !== BUILD_ID ? "reload" : "match";
  } catch {
    // Timed out or network unavailable. iOS Safari suspends the network while
    // it restores a tab, so this is expected there; desktop/Android don't.
    return "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

async function reloadIfStale() {
  // One-shot guard per session so a genuinely broken deployment can't loop.
  try {
    if (sessionStorage.getItem(BUILD_CHECK_KEY) === "1") return;
  } catch {}

  // No point checking while the tab is hidden; the visibilitychange listener
  // re-runs this when the user returns to the tab.
  if (document.visibilityState === "hidden") return;

  // Dedupe the events that fire together on load (mount + pageshow + visible).
  const now = Date.now();
  if (now - lastCheckAt < 3000) return;
  lastCheckAt = now;

  const result = await checkStaleBuild();
  if (result === "reload") {
    try {
      sessionStorage.setItem(BUILD_CHECK_KEY, "1");
    } catch {}
    window.location.reload();
    return;
  }
  if (result === "unavailable") {
    // Retry periodically: on iOS Safari the restored tab's network stays
    // suspended until the user interacts with the page (or iOS resumes it).
    // Once it returns, the next attempt sees the new build ID and reloads.
    if (timerRetries < MAX_TIMER_RETRIES) {
      timerRetries += 1;
      setTimeout(() => void reloadIfStale(), RETRY_MS);
    }
    return;
  }
  // match — the served build is current
  timerRetries = 0;
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

    // Detect a stale page and reload. This matters most on iOS Safari, which
    // restores open tabs on browser relaunch from a frozen page snapshot that
    // bypasses the network, the service worker, and HTTP Cache-Control — a
    // deployed update (e.g. an edited mockup) stays invisible until reloaded.
    // The mounted check runs on every load; the listeners re-check on bfcache
    // restores and when the tab becomes visible again.
    void reloadIfStale();

    const onPageShow = () => void reloadIfStale();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        timerRetries = 0; // fresh opportunity to poll after returning to the tab
        void reloadIfStale();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
