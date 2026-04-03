"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  past_due: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  canceled: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

interface SchoolSubscriptionRow {
  id: string
  school_id: string
  school_name: string | null
  admin_user_id: string
  admin_name: string | null
  admin_email: string | null
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: string
  plan: string | null
  quantity: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  active: number
  trialing: number
  past_due: number
  canceled: number
  inactive: number
  monthly_count: number
  yearly_count: number
  total_seats: number
  active_seats: number
}

export default function AdminSchoolSubscriptionsView() {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState<SchoolSubscriptionRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/school-subscriptions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSubscriptions(data.subscriptions || [])
        setStats(data.stats)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Failed to fetch school subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value === "all" ? "" : value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          <StatCard label={t("subscription.admin.total")} value={stats.total} />
          <StatCard label={t("subscription.status.active")} value={stats.active} color="text-green-600" />
          <StatCard label={t("subscription.status.trialing")} value={stats.trialing} color="text-blue-600" />
          <StatCard label={t("subscription.status.past_due")} value={stats.past_due} color="text-red-600" />
          <StatCard label={t("subscription.status.canceled")} value={stats.canceled} color="text-orange-600" />
          <StatCard label={t("subscription.admin.monthly")} value={stats.monthly_count} />
          <StatCard label={t("subscription.admin.yearly")} value={stats.yearly_count} />
          <StatCard label={t("subscription.admin.totalSeats")} value={stats.total_seats} />
          <StatCard label={t("subscription.admin.activeSeats")} value={stats.active_seats} color="text-green-600" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder={t("subscription.admin.searchSchoolPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("subscription.admin.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("subscription.status.active")}</SelectItem>
            <SelectItem value="trialing">{t("subscription.status.trialing")}</SelectItem>
            <SelectItem value="past_due">{t("subscription.status.past_due")}</SelectItem>
            <SelectItem value="canceled">{t("subscription.status.canceled")}</SelectItem>
            <SelectItem value="inactive">{t("subscription.status.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("subscription.admin.school")}</TableHead>
                <TableHead>{t("subscription.admin.admin")}</TableHead>
                <TableHead>{t("subscription.admin.plan")}</TableHead>
                <TableHead>{t("subscription.admin.seats")}</TableHead>
                <TableHead>{t("subscription.admin.status")}</TableHead>
                <TableHead>{t("subscription.admin.periodStart")}</TableHead>
                <TableHead>{t("subscription.admin.periodEnd")}</TableHead>
                <TableHead>{t("subscription.admin.cancelPending")}</TableHead>
                <TableHead>{t("subscription.admin.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {t("subscription.admin.noSchoolSubscriptions")}
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{sub.school_name || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{sub.admin_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{sub.admin_email || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.plan ? (
                        <Badge variant="secondary" className="text-xs">
                          {t(`subscription.${sub.plan}`)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{sub.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[sub.status] || ""}`}>
                        {t(`subscription.status.${sub.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(sub.current_period_start)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(sub.current_period_end)}
                    </TableCell>
                    <TableCell>
                      {sub.cancel_at_period_end ? (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          {t("subscription.admin.yes")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("subscription.admin.no")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(sub.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className={`text-xl font-bold ${color || ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}
