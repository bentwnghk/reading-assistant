"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BarChart3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClassCombobox } from "@/components/Internal/ClassCombobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import type { ClassInfo, SchoolInfo } from "@/lib/users"
import type { FeaturePopularityEntry, FeatureUsage } from "@/lib/feature-popularity"

type DateRange = "7" | "30" | "90" | "180" | "360" | "all"
type Metric = "uses" | "users"

const DATE_RANGES: { value: DateRange; labelKey: string }[] = [
  { value: "7", labelKey: "userManagement.aiQuestions.dateRange.7days" },
  { value: "30", labelKey: "userManagement.aiQuestions.dateRange.30days" },
  { value: "90", labelKey: "userManagement.aiQuestions.dateRange.90days" },
  { value: "180", labelKey: "userManagement.aiQuestions.dateRange.180days" },
  { value: "360", labelKey: "userManagement.aiQuestions.dateRange.360days" },
  { value: "all", labelKey: "userManagement.aiQuestions.dateRange.allTime" },
]

const STUDENT_COLOR = "#3b82f6"
const TEACHER_COLOR = "#f59e0b"

interface ChartRow {
  feature: string
  name: string
  students: number
  teachers: number
  studentsUses: number
  studentsUsers: number
  teachersUses: number
  teachersUsers: number
}

function PopularityTooltip({
  active,
  payload,
  metricLabel,
  usesLabel,
  usersLabel,
  studentsLabel,
  teachersLabel,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
  metricLabel: string
  usesLabel: string
  usersLabel: string
  studentsLabel: string
  teachersLabel: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  if (!row) return null
  const series = (label: string, color: string, usage: FeatureUsage) => (
    <div key={label} style={{ color }}>
      <p className="flex justify-between gap-4">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          {usage.uses} {usesLabel} · {usage.users} {usersLabel}
        </span>
      </p>
    </div>
  )
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md max-w-[280px]">
      <p className="font-medium mb-1">{row.name}</p>
      {series(studentsLabel, STUDENT_COLOR, { uses: row.studentsUses, users: row.studentsUsers })}
      {series(teachersLabel, TEACHER_COLOR, { uses: row.teachersUses, users: row.teachersUsers })}
      <div className="border-t mt-1 pt-1 text-muted-foreground">{metricLabel}</div>
    </div>
  )
}

interface FeaturePopularityViewProps {
  isSuperAdmin: boolean
  isAdmin: boolean
}

export default function FeaturePopularityView({ isSuperAdmin }: FeaturePopularityViewProps) {
  const { t } = useTranslation()

  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange>("30")
  const [metric, setMetric] = useState<Metric>("uses")
  const [features, setFeatures] = useState<FeaturePopularityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, schoolsRes] = await Promise.all([
          fetch("/api/classes"),
          isSuperAdmin ? fetch("/api/schools") : null,
        ])
        if (classesRes.ok) {
          setClasses(await classesRes.json())
        }
        if (schoolsRes && schoolsRes.ok) {
          setSchools(await schoolsRes.json())
        }
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.error(t("userManagement.loadFailed"))
      }
    }
    load()
  }, [t, isSuperAdmin])

  const loadPopularity = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && selectedSchoolId && selectedSchoolId !== "all") {
        params.set("schoolId", selectedSchoolId)
      }
      if (selectedClassId && selectedClassId !== "all") {
        params.set("classId", selectedClassId)
      }
      if (dateRange !== "all") {
        const d = new Date()
        d.setDate(d.getDate() - parseInt(dateRange, 10))
        params.set("startDate", d.toISOString())
      }

      const response = await fetch(`/api/feature-popularity?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch")
      }
      const data = await response.json()
      setFeatures(data.features || [])
    } catch (error) {
      console.error("Failed to load feature popularity:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [selectedSchoolId, selectedClassId, dateRange, t, isSuperAdmin])

  useEffect(() => {
    loadPopularity()
  }, [loadPopularity])

  const filteredClasses = useMemo(() => {
    const scoped = !isSuperAdmin || selectedSchoolId === "all"
      ? classes
      : classes.filter((c) => c.schoolId === selectedSchoolId)
    return [...scoped].sort((a, b) => a.name.localeCompare(b.name))
  }, [classes, selectedSchoolId, isSuperAdmin])

  const chartData: ChartRow[] = useMemo(() => {
    return features
      .map((f) => ({
        feature: f.feature,
        name: t(`userManagement.featurePopularity.features.${f.feature}`),
        students: f.students[metric],
        teachers: f.teachers[metric],
        studentsUses: f.students.uses,
        studentsUsers: f.students.users,
        teachersUses: f.teachers.uses,
        teachersUsers: f.teachers.users,
      }))
      .sort((a, b) => b.students + b.teachers - (a.students + a.teachers))
  }, [features, metric, t])

  const hasData = chartData.some((row) => row.students > 0 || row.teachers > 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("userManagement.featurePopularity.description")}
      </p>

      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select
            value={selectedSchoolId}
            onValueChange={(v) => {
              setSelectedSchoolId(v)
              setSelectedClassId("all")
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("userManagement.aiQuestions.selectSchool")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("userManagement.aiQuestions.allSchools")}</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="w-56">
          <ClassCombobox
            classes={filteredClasses}
            value={selectedClassId === "all" ? null : selectedClassId}
            onChange={(v) => setSelectedClassId(v ?? "all")}
            placeholder={t("userManagement.aiQuestions.selectClass")}
            emptyLabel={t("userManagement.classes.noClasses")}
            allowAll
            allLabel={t("userManagement.aiQuestions.allClasses")}
          />
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {t(r.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("userManagement.featurePopularity.chartTitle")}
          </h3>
          <div className="flex gap-1">
            <Button
              variant={metric === "uses" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setMetric("uses")}
            >
              {t("userManagement.featurePopularity.metric.uses")}
            </Button>
            <Button
              variant={metric === "users" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setMetric("users")}
            >
              {t("userManagement.featurePopularity.metric.users")}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[480px]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[480px] text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{t("userManagement.featurePopularity.noData")}</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(480, chartData.length * 26)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <Tooltip
                  content={
                    <PopularityTooltip
                      metricLabel={t(`userManagement.featurePopularity.metric.${metric}`)}
                      usesLabel={t("userManagement.featurePopularity.metric.uses")}
                      usersLabel={t("userManagement.featurePopularity.metric.users")}
                      studentsLabel={t("userManagement.featurePopularity.series.students")}
                      teachersLabel={t("userManagement.featurePopularity.series.teachers")}
                    />
                  }
                />
                <Bar
                  dataKey="students"
                  name={t("userManagement.featurePopularity.series.students")}
                  fill={STUDENT_COLOR}
                  radius={[0, 3, 3, 0]}
                />
                <Bar
                  dataKey="teachers"
                  name={t("userManagement.featurePopularity.series.teachers")}
                  fill={TEACHER_COLOR}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: STUDENT_COLOR }} />
                <span className="text-muted-foreground">
                  {t("userManagement.featurePopularity.series.students")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: TEACHER_COLOR }} />
                <span className="text-muted-foreground">
                  {t("userManagement.featurePopularity.series.teachers")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("userManagement.featurePopularity.ttsNote")}
      </p>
    </div>
  )
}
