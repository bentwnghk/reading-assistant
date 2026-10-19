"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldOff, TriangleAlert, X } from "lucide-react"

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

type Notice = { kind: "banned" } | { kind: "signInError"; code: string }

/**
 * Surfaces NextAuth sign-in failures on the client.
 *
 * - Banned users: NextAuth redirects to pages.error ("/") with
 *   ?error=AccessDenied; renders a fixed, dismissible banner explaining the
 *   ban, cleans the URL, and bridges the flag across a possible
 *   load-watchdog reload (page.tsx) via sessionStorage.
 * - Any other failure (e.g. ?error=Configuration, which NextAuth uses to mask
 *   transient server-side errors during the OAuth callback): renders a
 *   dismissible "sign-in failed, please retry" banner with the error code.
 *
 * Mounted once in the root layout.
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
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let next: Notice | null = null
    if (initialAuthError) {
      next = isBanError(initialAuthError)
        ? { kind: "banned" }
        : { kind: "signInError", code: initialAuthError }
    }

    if (next?.kind === "banned") {
      // Persist across a possible load-watchdog reload, then clean the URL.
      try {
        sessionStorage.setItem(BAN_FLAG_KEY, "1")
      } catch {}
    } else if (!next) {
      try {
        if (sessionStorage.getItem(BAN_FLAG_KEY) === "1") next = { kind: "banned" }
      } catch {}
    }

    if (initialAuthError) {
      const params = new URLSearchParams(window.location.search)
      params.delete("error")
      const query = params.toString()
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      )
    }

    setNotice(next)
  }, [])

  if (!notice) return null

  const dismiss = () => {
    if (notice.kind === "banned") {
      try {
        sessionStorage.removeItem(BAN_FLAG_KEY)
      } catch {}
    }
    setNotice(null)
  }

  if (notice.kind === "banned") {
    return (
      <div
        role="alert"
        className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      >
        <ShieldOff className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">{t("header.auth.banned")}</span>
        <DismissButton onClick={dismiss} hover="red" />
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">
        {t("header.auth.signInError", { code: notice.code })}
      </span>
      <DismissButton onClick={dismiss} hover="amber" />
    </div>
  )
}

function DismissButton({ onClick, hover }: { onClick: () => void; hover: "red" | "amber" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Dismiss"
      className={`ml-2 shrink-0 rounded p-1 ${
        hover === "red"
          ? "hover:bg-red-100 dark:hover:bg-red-900"
          : "hover:bg-amber-100 dark:hover:bg-amber-900"
      }`}
    >
      <X className="h-4 w-4" />
    </button>
  )
}
