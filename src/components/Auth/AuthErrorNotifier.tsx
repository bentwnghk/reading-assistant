"use client"

import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ShieldOff } from "lucide-react"

/**
 * Surfaces NextAuth sign-in failures on the client. When a banned user tries
 * to sign in, NextAuth redirects to pages.error ("/") with ?error=AccessDenied;
 * this component shows a persistent, translated toast explaining the ban and
 * cleans the URL. Mounted once in the root layout.
 */
export function AuthErrorNotifier() {
  const { t, ready } = useTranslation()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current || !ready) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") !== "AccessDenied") return

    firedRef.current = true
    toast.error(t("header.auth.banned"), {
      duration: Infinity,
      dismissible: true,
      icon: <ShieldOff className="h-4 w-4" />,
    })

    params.delete("error")
    const query = params.toString()
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    )
  }, [ready, t])

  return null
}
