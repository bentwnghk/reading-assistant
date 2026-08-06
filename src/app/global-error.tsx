"use client";

import { useEffect } from "react";

/**
 * Global error boundary.
 *
 * Catches errors that escape the root layout — including throws that happen
 * during the synchronous module evaluation of the Zustand stores on a fresh
 * page load (e.g. iOS Safari restoring a killed tab where localStorage access
 * or `JSON.parse` on a truncated entry throws before any error boundary inside
 * the tree has mounted).
 *
 * Recovery strategy: the single most reliable fix for a tab restored after the
 * browser killed it is a fresh navigation, which is what users do manually. So
 * the first time this boundary catches an error in a tab session we trigger one
 * automatic reload (tracked via sessionStorage so it cannot loop). If the page
 * still errors after that, we fall back to a recoverable UI.
 */
const RELOAD_FLAG = "__next_global_err_reloaded";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console so it is diagnosable, matching the
    // "see the browser console for more information" hint in the default message.
    console.error("[global-error]", error);

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === "1";
    } catch {
      alreadyTried = false;
    }

    if (!alreadyTried) {
      try {
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {}
      // A full reload re-initializes the browser origin/state and is the known
      // workaround for the restore-from-killed-tab crash.
      window.location.reload();
    }
  }, [error]);

  const handleReset = () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {}
    reset();
  };

  const handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {}
    window.location.reload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#a1a1aa", margin: 0 }}>
            The page hit an error while loading. Try reloading — if the problem
            persists, return to the home page.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleReload}
              style={{
                padding: "10px 20px",
                fontSize: 15,
                borderRadius: 8,
                border: "1px solid #3f3f46",
                background: "#fafafa",
                color: "#0a0a0a",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "10px 20px",
                fontSize: 15,
                borderRadius: 8,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#fafafa",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
          {error?.message ? (
            <p
              style={{
                marginTop: 20,
                fontSize: 12,
                color: "#71717a",
                wordBreak: "break-word",
              }}
            >
              {error.message}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
