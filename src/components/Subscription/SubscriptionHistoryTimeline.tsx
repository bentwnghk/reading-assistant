"use client"

import { useTranslation } from "react-i18next"
import {
  CheckCircle2,
  RefreshCw,
  CalendarX,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type SubscriptionEventType =
  | "started"
  | "renewed"
  | "cancel_scheduled"
  | "reactivated"
  | "canceled"
  | "past_due"

export interface HistoryEvent {
  id: string
  event_type: SubscriptionEventType
  status: string | null
  plan: string | null
  quantity?: number | null
  period_start: string | null
  period_end: string | null
  trial_end: string | null
  event_time: string
}

interface EventMeta {
  labelKey: string
  Icon: typeof CheckCircle2
  dot: string
}

const EVENT_META: Record<SubscriptionEventType, EventMeta> = {
  started: {
    labelKey: "subscription.admin.eventType.started",
    Icon: CheckCircle2,
    dot: "bg-green-500",
  },
  renewed: {
    labelKey: "subscription.admin.eventType.renewed",
    Icon: RefreshCw,
    dot: "bg-blue-500",
  },
  cancel_scheduled: {
    labelKey: "subscription.admin.eventType.cancel_scheduled",
    Icon: CalendarX,
    dot: "bg-amber-500",
  },
  reactivated: {
    labelKey: "subscription.admin.eventType.reactivated",
    Icon: RotateCcw,
    dot: "bg-emerald-500",
  },
  canceled: {
    labelKey: "subscription.admin.eventType.canceled",
    Icon: XCircle,
    dot: "bg-red-500",
  },
  past_due: {
    labelKey: "subscription.admin.eventType.past_due",
    Icon: AlertTriangle,
    dot: "bg-red-500",
  },
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateStr: string | null, locale: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTenure(fromIso: string, toIso: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return "-"
  const totalDays = Math.floor((to - from) / (1000 * 60 * 60 * 24))
  const months = Math.floor(totalDays / 30)
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (years > 0 && remMonths > 0) {
    return t("subscription.admin.tenureYM", { years, months: remMonths })
  }
  if (years > 0) {
    return t("subscription.admin.tenureY", { years, count: years })
  }
  if (months > 0) {
    return t("subscription.admin.tenureM", { months, count: months })
  }
  return t("subscription.admin.tenureD", { days: totalDays, count: totalDays })
}

export default function SubscriptionHistoryTimeline({
  events,
  showQuantity = false,
}: {
  events: HistoryEvent[]
  showQuantity?: boolean
}) {
  const { t, i18n } = useTranslation()

  if (events.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        {t("subscription.admin.noHistory")}
      </div>
    )
  }

  const ascending = [...events].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  )
  const firstEvent = ascending[0]
  const lastCanceled = [...events]
    .filter((e) => e.event_type === "canceled")
    .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())[0]
  const tenureEnd = lastCanceled ? lastCanceled.event_time : new Date().toISOString()
  const billingPeriods = events.filter(
    (e) => e.event_type === "started" || e.event_type === "renewed"
  ).length

  return (
    <div className="py-3">
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <div>
          <span className="text-muted-foreground">{t("subscription.admin.subscriberSince")}: </span>
          <span className="font-medium">{formatDate(firstEvent.event_time, i18n.language)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("subscription.admin.totalTenure")}: </span>
          <span className="font-medium">
            {formatTenure(firstEvent.event_time, tenureEnd, t)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("subscription.admin.billingPeriods")}: </span>
          <span className="font-medium">{billingPeriods}</span>
        </div>
      </div>

      <ol className="relative ml-3 border-l border-border">
        {events.map((evt) => {
          const meta = EVENT_META[evt.event_type] ?? EVENT_META.started
          const { Icon } = meta
          return (
            <li key={evt.id} className="mb-4 ml-6 last:mb-0">
              <span
                className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-background ${meta.dot}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t(meta.labelKey)}</span>
                {evt.plan && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`subscription.${evt.plan}`)}
                  </Badge>
                )}
                {showQuantity && typeof evt.quantity === "number" && evt.quantity > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {t("subscription.admin.seatsCount", { count: evt.quantity })}
                  </Badge>
                )}
                {evt.status && (
                  <span className="text-xs text-muted-foreground">
                    {t(`subscription.status.${evt.status}`, evt.status)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(evt.event_time, i18n.language)}
                </span>
                {evt.period_start && (
                  <span>
                    {t("subscription.admin.periodStart")}: {formatDate(evt.period_start, i18n.language)}
                  </span>
                )}
                {evt.period_end && (
                  <span>
                    {t("subscription.admin.periodEnd")}: {formatDate(evt.period_end, i18n.language)}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
