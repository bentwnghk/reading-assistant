"use client";

import { useEffect } from "react";

// Build marker this bundle was compiled with (inlined via next.config env).
// The server exposes its own copy through /api/config; if they differ, this
// page is an outdated cached copy and must be reloaded to get the latest build.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";
const RELOAD_THROTTLE_KEY = "__proreader_build_reloaded_at";
const RELOAD_THROTTLE_MS = 20000;
const FETCH_TIMEOUT_MS = 5000;
const RETRY_MS = 10000;
const MAX_TIMER_RETRIES = 18; // ~3 minutes of timer-driven retries per visibility period
const REFRESH_PARAM = "__proreader_build";

let timerRetries = 0;
let lastCheckAt = 0;
// Assume the served build is fresh until a check proves otherwise, so a click on
// a normal (network-available) page never triggers a reload. Set to false when
// the build could not be verified (the iOS restored-tab / offline state).
let verifiedFresh = true;

function canReloadNow(): boolean {
  try {
    const last = parseInt(sessionStorage.getItem(RELOAD_THROTTLE_KEY) || "0", 10);
    return Date.now() - last >= RELOAD_THROTTLE_MS;
  } catch {
    return true;
  }
}

function markReload() {
  try {
    sessionStorage.setItem(RELOAD_THROTTLE_KEY, String(Date.now()));
  } catch {}
}

function navigateToFreshBuild(buildId?: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(REFRESH_PARAM, buildId || Date.now().toString(36));
  window.location.replace(url.toString());
}

function removeRefreshParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(REFRESH_PARAM)) return;
  url.searchParams.delete(REFRESH_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
}

// Returns "reload" if the served build is stale, "match" if it is current,
// or "unavailable" if the network could not be reached. The Promise.race
// guarantees this resolves even when iOS Safari's suspended network keeps the
// fetch pending forever (AbortController.abort() is not always honored there).
type BuildCheckResult =
  | { status: "reload"; buildId: string }
  | { status: "match" | "unavailable" };

async function checkStaleBuild(): Promise<BuildCheckResult> {
  const controller = new AbortController();
  // A unique URL prevents an older service worker from satisfying this check
  // with a cached /api/config response from the same old deployment.
  const checkUrl = `/api/config?build-check=${encodeURIComponent(
    `${BUILD_ID}-${Date.now()}`
  )}`;
  const attempt = fetch(checkUrl, {
    cache: "no-store",
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 404) return { status: "match" } as const; // no /api/config (static export)
      if (!res.ok) return { status: "unavailable" } as const;
      const data = (await res.json()) as { buildId?: string };
      return data.buildId && data.buildId !== BUILD_ID
        ? ({ status: "reload", buildId: data.buildId } as const)
        : ({ status: "match" } as const);
    })
    .catch(() => ({ status: "unavailable" }) as const);
  const fallback = new Promise<BuildCheckResult>((resolve) =>
    setTimeout(() => {
      try {
        controller.abort();
      } catch {}
      resolve({ status: "unavailable" });
    }, FETCH_TIMEOUT_MS)
  );
  return Promise.race([attempt, fallback]);
}

// iOS Safari restores a relaunched tab from a page archive that bypasses the
// network, the service worker, and HTTP Cache-Control, and it only lifts that
// restored tab's network suspension after a real user ACTIVATION — `click`,
// not `pointerdown` (the same reason the LOAD_WATCHDOG uses an onClick button
// in page.tsx). If the served build could not be verified as current, the next
// click reloads: the click unblocks the network and the reload is a real
// navigation that fetches the latest build.
function onUserClick() {
  if (verifiedFresh) return;
  if (!canReloadNow()) return;
  markReload();
  navigateToFreshBuild();
}

async function reloadIfStale() {
  // Throttle auto-reloads so a reload that comes back stale (network still
  // suspended) can try again instead of being stuck for the whole session.
  if (!canReloadNow()) return;

  // No point checking while the tab is hidden; the visibilitychange listener
  // re-runs this when the user returns to the tab.
  if (document.visibilityState === "hidden") return;

  // Dedupe the events that fire together on load (mount + pageshow + visible).
  const now = Date.now();
  if (now - lastCheckAt < 3000) return;
  lastCheckAt = now;

  const result = await checkStaleBuild();
  if (result.status === "reload") {
    markReload();
    navigateToFreshBuild(result.buildId);
    return;
  }
  if (result.status === "unavailable") {
    // The build could not be verified (iOS restored-tab network suspension, or
    // offline). Keep polling in case the network comes back on its own, and arm
    // the click recovery so the first real user activation reloads to the
    // latest build.
    verifiedFresh = false;
    if (timerRetries < MAX_TIMER_RETRIES) {
      timerRetries += 1;
      setTimeout(() => void reloadIfStale(), RETRY_MS);
    }
    return;
  }
  // match — the served build is current
  verifiedFresh = true;
  timerRetries = 0;
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // The query parameter exists only to force a real, cache-busted navigation.
    // Remove it once the fresh document has loaded so links stay canonical.
    removeRefreshParam();

    // The app hydrated successfully, so clear the one-shot global-error reload
    // flag (see src/app/global-error.tsx). This lets a future error auto-reload
    // once again instead of being stuck on the manual recovery UI.
    try {
      sessionStorage.removeItem("__next_global_err_reloaded");
    } catch {}

    let onControllerChange: (() => void) | undefined;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => {});

      // When a new service worker (from a fresh deploy) takes control of an
      // already-controlled page, reload immediately so the user gets the new
      // build instead of the old cached code. Skipped on first visit (no
      // controller yet) so a brand-new user is not reloaded.
      if (navigator.serviceWorker.controller) {
        onControllerChange = () => navigateToFreshBuild();
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange
        );
      }
    }

    // Detect a stale page and recover. The mounted check runs on every load;
    // the listeners re-check on bfcache restores and when the tab becomes
    // visible again. See reloadIfStale/onUserClick for the iOS-specific path.
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
    document.addEventListener("click", onUserClick);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onUserClick);
      if (onControllerChange) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
      }
    };
  }, []);

  return null;
}
