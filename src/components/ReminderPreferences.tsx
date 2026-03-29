"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Bell } from "lucide-react"
import { cn } from "@/utils/style"
import { toast } from "sonner"

interface ReminderPreferencesState {
  enabled: boolean
  frequencyDays: number
  loaded: boolean
}

export default function ReminderPreferences() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const [prefs, setPrefs] = useState<ReminderPreferencesState>({
    enabled: true,
    frequencyDays: 3,
    loaded: false,
  })

  const isAuthenticated = status === "authenticated" && !!session?.user?.id

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/reminders/preferences")
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setPrefs({
              enabled: data.enabled ?? true,
              frequencyDays: data.frequencyDays ?? 3,
              loaded: true,
            })
          }
        }
      } catch {
        if (!cancelled) {
          setPrefs((p) => ({ ...p, loaded: true }))
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const savePreferences = useCallback(
    async (enabled: boolean, frequencyDays: number) => {
      try {
        const res = await fetch("/api/reminders/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled, frequencyDays }),
        })
        if (res.ok) {
          toast.success(t("reminder.saved"))
        }
      } catch {
        // silent
      }
    },
    [t]
  )

  if (!isAuthenticated) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("reminder.loginRequired")}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-sm font-medium flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            {t("reminder.emailReminders")}
          </label>
          <p className="text-xs text-muted-foreground">
            {t("reminder.emailRemindersTip")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          disabled={!prefs.loaded}
          onClick={() => {
            const newValue = !prefs.enabled
            setPrefs((p) => ({ ...p, enabled: newValue }))
            savePreferences(newValue, prefs.frequencyDays)
          }}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !prefs.loaded && "opacity-50 cursor-not-allowed",
            prefs.loaded && "cursor-pointer",
            prefs.enabled ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
              prefs.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div
        className={cn("space-y-1", {
          "opacity-50 pointer-events-none": !prefs.enabled,
        })}
      >
        <label className="text-sm font-medium">
          {t("reminder.remindEvery")}
        </label>
        <select
          value={prefs.frequencyDays}
          disabled={!prefs.enabled}
          onChange={(e) => {
            const val = Number(e.target.value)
            setPrefs((p) => ({ ...p, frequencyDays: val }))
            savePreferences(prefs.enabled, val)
          }}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={1}>1 {t("reminder.day")}</option>
          <option value={2}>2 {t("reminder.days")}</option>
          <option value={3}>3 {t("reminder.days")}</option>
          <option value={5}>5 {t("reminder.days")}</option>
          <option value={7}>7 {t("reminder.days")}</option>
          <option value={14}>14 {t("reminder.days")}</option>
        </select>
      </div>
    </div>
  )
}
