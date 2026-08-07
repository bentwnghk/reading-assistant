"use client";

import { useEffect } from "react";

// Build marker this bundle was compiled with (inlined via next.config env).
// The server exposes its own copy through /api/config; if they differ, this
// page is an outdated cached copy and must be reloaded to get the latest build.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";
const RELOAD_THROTTLE_KEY = "__proreader_build_reloaded_at";
const RELOAD_THROTTLE_MS = 20000;
const FETCH_TIMEOUT_MS = 6000;
const RETRY_MS = 10000;
const MAX_TIMER_RETRIES = 18; // ~3 minutes of timer-driven retries per visibility period

let timerRetries = 0;
let lastCheckAt = 0;
let interactionListenersArmed = false;

// Returns "reload" if the served build is stale, "match" if it is current,
// or "unavailable" if the network could not be reached. The Promise.race
// guarantees this resolves even when iOS Safari's suspended network keeps the
// fetch pending forever (AbortController.abort() is not always honored there).
async function checkStaleBuild(): Promise<"reload" | "match" | "unavailable"> {
  const controller = new AbortController();
  const attempt = fetch("/api/config", {
    cache: "no-store",
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 404) return "match" as const; // no /api/config (static export)
      if (!res.ok) return "unavailable" as const;
      const data = (await res.json()) as { buildId?: string };
      return data.buildId && data.buildId !== BUILD_ID
        ? ("reload" as const)
        : ("match" as const);
    })
    .catch(() => "unavailable" as const);
  const fallback = new Promise<"unavailable">((resolve) =>
    setTimeout(() => {
      try {
        controller.abort();
      } catch {}
      resolve("unavailable");
    }, FETCH_TIMEOUT_MS)
  );
  return Promise.race([attempt, fallback]);
}

async function reloadIfStale() {
  // Throttle auto-reloads so a reload that comes back stale (network still
  // suspended) can try again instead of being stuck for the whole session.
  try {
    const last = parseInt(sessionStorage.getItem(RELOAD_THROTTLE_KEY) || "0", 10);
    if (Date.now() - last < RELOAD_THROTTLE_MS) return;
  } catch {}

  // No point checking while the tab is hidden; the visibilitychange listener
  // re-runs this when the user returns to the tab.
  if (document.visibilityState === "hidden") return;

  // Dedupe the events that fire together on load (mount + pageshow + visible)
  // and the interaction-triggered re-checks below.
  const now = Date.now();
  if (now - lastCheckAt < 3000) return;
  lastCheckAt = now;

  const result = await checkStaleBuild();
  if (result === "reload") {
    try {
      sessionStorage.setItem(RELOAD_THROTTLE_KEY, String(Date.now()));
    } catch {}
    window.location.reload();
    return;
  }
  if (result === "unavailable") {
    // iOS Safari keeps a restored tab's network suspended until the user
    // interacts with the page (or iOS resumes it). Keep polling, and also arm
    // interaction listeners so the reload fires right after the first tap —
    // the gesture is what unblocks the network.
    if (timerRetries < MAX_TIMER_RETRIES) {
      timerRetries += 1;
      setTimeout(() => void reloadIfStale(), RETRY_MS);
    }
    armInteractionListeners();
    return;
  }
  // match — the served build is current
  timerRetries = 0;
  disarmInteractionListeners();
}

function armInteractionListeners() {
  if (interactionListenersArmed) return;
  interactionListenersArmed = true;
  window.addEventListener("pointerdown", reloadIfStale);
  window.addEventListener("keydown", reloadIfStale);
}

function disarmInteractionListeners() {
  if (!interactionListenersArmed) return;
  interactionListenersArmed = false;
  window.removeEventListener("pointerdown", reloadIfStale);
  window.removeEventListener("keydown", reloadIfStale);
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
    // restores open tabs on browser relaunch from a page snapshot that bypasses
    // the network, the service worker, and HTTP Cache-Control — a deployed
    // update (e.g. an edited mockup) stays invisible until reloaded. The
    // mounted check runs on every load; the listeners re-check on bfcache
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
      disarmInteractionListeners();
    };
  }, []);

  return null;
}
