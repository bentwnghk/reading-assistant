"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, BarChart3, BookOpen, Trophy, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useSubscription from "@/hooks/useSubscription"

interface UsageData {
  period: {
    start: string
    end: string
  }
  activities: {
    total: number
    breakdown: { activity_type: string; count: number }[]
    daily: { date: string; count: number }[]
  }
  sessions: {
    total: number
    testsCompleted: number
    avgTestScore: number | null
  }
  subscription: {
    status: string
    plan: string | null
    current_period_start: string | null
    current_period_end: string | null
    trial_end: string | null
  } | null
}

const ACTIVITY_ICONS: Record<string, string> = {
  session_create: "\u{1F4D6}",
  test_complete: "\u{1F4DD}",
  quiz_complete: "\u{1F9E0}",
  spelling_complete: "\u{270F}\u{FE0F}",
  flashcard_review: "\u{1F4DA}",
  mindmap_generate: "\u{1F5FA}\u{FE0F}",
  adapted_text_generate: "\u{270D}\u{FE0F}",
  simplified_text_generate: "\u{270D}\u{FE0F}",
  sentence_analyze: "\u{1F50D}",
  targeted_practice_complete: "\u{1F3AF}",
  glossary_add: "\u{1F4D2}",
  ai_tutor_question: "\u{1F916}",
}

const ACTIVITY_LABELS: Record<string, { en: string; zh: string }> = {
  session_create: { en: "Reading Sessions", zh: "\u{95B1}\u{8B80}\u{6BB5}" },
  test_complete: { en: "Tests", zh: "\u{6E2C}\u{9A57}" },
  quiz_complete: { en: "Vocabulary Quizzes", zh: "\u{8A5E}\u{5F59}\u{6E2C}\u{9A57}" },
  spelling_complete: { en: "Spelling Games", zh: "\u{62FC}\u{5B57}\u{904A}\u{6232}" },
  flashcard_review: { en: "Flashcard Reviews", zh: "\u{751F}\u{5B57}\u{5361}\u{6EAB}\u{7FD2}" },
  mindmap_generate: { en: "Mind Maps", zh: "\u{601D}\u{7DAD}\u{5C0E}\u{5716}" },
  adapted_text_generate: { en: "Adapted Texts", zh: "\u{6539}\u{5BEB}\u{6587}\u{672C}" },
  simplified_text_generate: { en: "Simplified Texts", zh: "\u{7C21}\u{5316}\u{6587}\u{672C}" },
  sentence_analyze: { en: "Sentence Analysis", zh: "\u{53E5}\u{5B50}\u{5206}\u{6790}" },
  targeted_practice_complete: { en: "Targeted Practice", zh: "\u{91DD}\u{5C0D}\u{6027}\u{7DF4}\u{7FD2}" },
  glossary_add: { en: "Glossary Words", zh: "\u{8A5E}\u{5F59}\u{5B57}" },
  ai_tutor_question: { en: "AI Tutor Questions", zh: "AI \u{5C0E}\u{5E2B}\u{63D0}\u{554F}" },
}

function getActivityLabel(type: string, locale: string): string {
  const labels = ACTIVITY_LABELS[type]
  if (!labels) return type
  return locale.startsWith("zh") ? labels.zh : labels.en
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function UsageDashboard() {
  const { t } = useTranslation()
  const { subscription } = useSubscription()
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("current")

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view })
      const res = await fetch(`/api/subscription/usage?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error)
    } finally {
      setLoading(false)
    }
  }, [view])

  useEffect(() => {
    if (subscription?.hasSubscription) {
      fetchUsage()
    }
  }, [subscription, fetchUsage])

  if (!subscription?.hasSubscription) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const locale = "en-US"
  const maxDailyCount = Math.max(...data.activities.daily.map((d) => d.count), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t("subscription.usage.title")}
        </h4>
        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">{t("subscription.usage.currentPeriod")}</SelectItem>
            <SelectItem value="last30">{t("subscription.usage.last30Days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniStat
          icon={<BookOpen className="h-4 w-4" />}
          label={t("subscription.usage.sessions")}
          value={data.sessions.total}
        />
        <MiniStat
          icon={<Target className="h-4 w-4" />}
          label={t("subscription.usage.testsCompleted")}
          value={data.sessions.testsCompleted}
        />
        <MiniStat
          icon={<Trophy className="h-4 w-4" />}
          label={t("subscription.usage.avgScore")}
          value={data.sessions.avgTestScore != null ? `${data.sessions.avgTestScore}%` : "-"}
        />
        <MiniStat
          icon={<BarChart3 className="h-4 w-4" />}
          label={t("subscription.usage.totalActivities")}
          value={data.activities.total}
        />
      </div>

      {data.activities.daily.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("subscription.usage.dailyActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-end gap-[2px] h-24">
              {data.activities.daily.map((d) => {
                const height = (d.count / maxDailyCount) * 100
                return (
                  <div
                    key={d.date}
                    className="flex-1 bg-primary/80 rounded-t-sm min-w-[3px] transition-all hover:bg-primary"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${d.date}: ${d.count}`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {formatDate(data.period.start)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(data.period.end)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {data.activities.breakdown.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("subscription.usage.activityBreakdown")}
          </p>
          {data.activities.breakdown.map((item) => {
            const pct = data.activities.total > 0
              ? Math.round((item.count / data.activities.total) * 100)
              : 0
            return (
              <div key={item.activity_type} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">
                  {ACTIVITY_ICONS[item.activity_type] || "\u{1F4CB}"}
                </span>
                <span className="text-xs flex-1 truncate">
                  {getActivityLabel(item.activity_type, locale)}
                </span>
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">
                  {item.count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
