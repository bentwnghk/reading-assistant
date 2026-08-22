"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldOff, X } from "lucide-react"

const BAN_FLAG_KEY = "__auth_ban_notice"

// Captured at module-load time — the earliest client code that runs, before
// any router/service-worker code could rewrite the URL — so the notice
// survives even if the query param is cleaned before React effects run.
const initialAuthError =
  typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("error") ?? "").toLowerCase()
    : ""

function isBanError(err: string): boolean {
  return err === "accessdenied" || err === "access_denied"
}

/**
 * Surfaces NextAuth sign-in failures on the client. When a banned user tries
 * to sign in, NextAuth redirects to pages.error ("/") with ?error=AccessDenied;
 * this component renders a fixed, dismissible banner explaining the ban,
 * cleans the URL, and bridges the flag across a possible load-watchdog reload
 * (page.tsx) via sessionStorage. Mounted once in the root layout.
 *
 * Deliberately avoids useSuspense (no Suspense boundary exists in the layout)
 * and toast libraries (no dependency on Toaster mount timing).
 */
export function AuthErrorNotifier() {
  // useSuspense: false — the root layout has no Suspense boundary, and a
  // suspending component there can hang the initial effect.
  const { t } = useTranslation(undefined, { useSuspense: false })
  // Derived post-mount (not in a useState initializer) so SSR and the first
  // client render agree (null), avoiding a hydration mismatch.
  const [banned, setBanned] = useState(false)

  useEffect(() => {
    if (isBanError(initialAuthError)) {
      setBanned(true)
      // Persist across a possible load-watchdog reload, then clean the URL.
      try {
        sessionStorage.setItem(BAN_FLAG_KEY, "1")
      } catch {}
      const params = new URLSearchParams(window.location.search)
      params.delete("error")
      const query = params.toString()
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      )
      return
    }
    try {
      if (sessionStorage.getItem(BAN_FLAG_KEY) === "1") setBanned(true)
    } catch {}
  }, [])

  if (!banned) return null

  const dismiss = () => {
    try {
      sessionStorage.removeItem(BAN_FLAG_KEY)
    } catch {}
    setBanned(false)
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <ShieldOff className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{t("header.auth.banned")}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-2 shrink-0 rounded p-1 hover:bg-red-100 dark:hover:bg-red-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
