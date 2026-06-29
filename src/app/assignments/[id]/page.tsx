"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarClock,
  Users,
  Loader2,
  Download,
  TrendingUp,
  Award,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Play,
  Eye,
  BookOpenCheck,
  ClipboardList,
  SpellCheck,
  GraduationCap,
  Gamepad2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { exportAssignmentRoster } from "@/utils/assignmentExcel"
import { AssignmentStats } from "@/components/Assignments/AssignmentStats"

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Hong_Kong",
    })
  } catch {
    return ""
  }
}

function isOverdue(iso?: string | null): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

function scoreCell(score: number | null | undefined): string {
  if (score == null) return "-"
  return String(score)
}

function SortableHead({
  col,
  current,
  dir,
  onSort,
  className,
  children,
}: {
  col: string
  current: string
  dir: "asc" | "desc"
  onSort: (col: never) => void
  className?: string
  children: React.ReactNode
}) {
  const active = col === current
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(col as never)}
        className="flex items-center gap-1 hover:text-foreground transition-colors select-none w-full"
      >
        <span className="flex-1">{children}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-foreground" : "text-muted-foreground/50"}`} />
      </button>
    </TableHead>
  )
}

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession()
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [roster, setRoster] = useState<AssignmentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Graceful auth redirect: bounce unauthenticated visitors to home.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/")
  }, [status, router])

  const role = session?.user?.role
  const isTeacher = role === "teacher" || role === "admin" || role === "super-admin"

  type SortKey = "student" | "progress" | "testScore" | "vocabScore" | "spellingScore" | "grammarQuizScore" | "grammarGameScore" | "lastViewedAt"
  const [sortKey, setSortKey] = useState<SortKey>("student")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "student" ? "asc" : "desc")
    }
  }

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "student":
          cmp = (a.studentName || a.studentEmail || "").localeCompare(
            b.studentName || b.studentEmail || "",
          )
          break
        case "progress":
          cmp = (a.progress ?? 0) - (b.progress ?? 0)
          break
        case "testScore":
          cmp = (a.testScore ?? -1) - (b.testScore ?? -1)
          break
        case "vocabScore":
          cmp = (a.vocabularyQuizScore ?? -1) - (b.vocabularyQuizScore ?? -1)
          break
        case "spellingScore":
          cmp = (a.spellingGameAccuracy ?? -1) - (b.spellingGameAccuracy ?? -1)
          break
        case "grammarQuizScore":
          cmp = (a.grammarQuizScore ?? -1) - (b.grammarQuizScore ?? -1)
          break
        case "grammarGameScore":
          cmp = (a.grammarGameAccuracy ?? -1) - (b.grammarGameAccuracy ?? -1)
          break
        case "lastViewedAt":
          cmp =
            (a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0) -
            (b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [roster, sortKey, sortDir])

  const load = useCallback(async () => {
    const { id } = await params
    setLoading(true)
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`/api/assignments/${id}`),
        isTeacher
          ? fetch(`/api/assignments/${id}/submissions`)
          : Promise.resolve(null),
      ])
      if (aRes.status === 404) {
        setNotFound(true)
        return
      }
      if (!aRes.ok) throw new Error("Failed")
      setAssignment(await aRes.json())
      if (rRes && rRes.ok) {
        setRoster(await rRes.json())
      }
    } catch {
      toast.error(t("assignments.error.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [params, isTeacher, t])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !assignment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t("assignments.error.notFound")}</p>
        <Link href="/assignments">
          <Button variant="outline">{t("assignments.back")}</Button>
        </Link>
      </div>
    )
  }

  const overdue = assignment.status === "active" && isOverdue(assignment.dueDate)

  async function handleExport() {
    if (!assignment) return
    setExporting(true)
    try {
      await exportAssignmentRoster({
        assignment,
        submissions: roster,
        locale: i18n.language,
        t: (key: string, opts?: Record<string, unknown>) => t(key, opts),
      })
      toast.success(t("assignments.teacherView.exportExcel"))
    } catch {
      toast.error(t("assignments.error.loadFailed"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/assignments")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("assignments.back")}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-2xl font-bold truncate">{assignment.title}</h1>
                {assignment.subject && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {assignment.subject}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                  {t(`assignments.status.${assignment.status}`)}
                </Badge>
                {overdue && (
                  <Badge variant="destructive">
                    {t("assignments.teacherView.overdue")}
                  </Badge>
                )}
              </div>
            </div>
            {assignment.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {assignment.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              {isTeacher && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t("assignments.teacherView.studentCount", {
                    count: assignment.studentCount ?? roster.length,
                  })}
                </span>
              )}
              {assignment.dueDate ? (
                <span
                  className={`inline-flex items-center gap-1 ${
                    overdue ? "text-destructive" : ""
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {t("assignments.studentView.due", {
                    date: formatDate(assignment.dueDate, i18n.language),
                  })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("assignments.studentView.noDueDate")}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("assignments.teacherView.avgProgress", {
                  progress: assignment.avgProgress ?? 0,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {isTeacher && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || roster.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              {exporting ? t("assignments.create.creating") : t("assignments.teacherView.exportExcel")}
            </Button>
          </div>
        )}

        {isTeacher && roster.length > 0 && <AssignmentStats roster={roster} />}

        {/* Teacher: roster table; Student: rendered by StudentAssignmentDetail below */}
        {isTeacher ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead col="student" current={sortKey} dir={sortDir} onSort={handleSort}>
                      {t("assignments.teacherView.student") || "Student"}
                    </SortableHead>
                    <SortableHead col="progress" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24">
                      {t("assignments.teacherView.progressCol")}
                    </SortableHead>
                    <SortableHead col="testScore" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20">
                      {t("assignments.teacherView.testScoreCol")}
                    </SortableHead>
                    <SortableHead col="vocabScore" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20">
                      {t("assignments.teacherView.vocabCol")}
                    </SortableHead>
                    <SortableHead col="spellingScore" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20">
                      {t("assignments.teacherView.spellingCol")}
                    </SortableHead>
                    <SortableHead col="grammarQuizScore" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20">
                      {t("assignments.teacherView.grammarQuizCol")}
                    </SortableHead>
                    <SortableHead col="grammarGameScore" current={sortKey} dir={sortDir} onSort={handleSort} className="w-20">
                      {t("assignments.teacherView.grammarGameCol")}
                    </SortableHead>
                    <SortableHead col="lastViewedAt" current={sortKey} dir={sortDir} onSort={handleSort} className="w-36">
                      {t("assignments.teacherView.lastViewedCol")}
                    </SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {t("assignments.teacherView.notStarted")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRoster.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={s.studentImage || undefined} />
                              <AvatarFallback>
                                {s.studentName?.[0] || s.studentEmail?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {s.studentName || t("assignments.teacherView.notStarted")}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {s.studentEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${s.progress}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">{s.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.testScore)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.vocabularyQuizScore)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.spellingGameAccuracy)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.grammarQuizScore)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.grammarGameAccuracy)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.lastViewedAt
                            ? formatDateTime(s.lastViewedAt, i18n.language)
                            : t("assignments.teacherView.never")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <StudentAssignmentDetail assignment={assignment} />
        )}
      </div>
    </div>
  )
}

/**
 * Student view: shows their personal progress on this assignment with a
 * "Start / Continue / Review" CTA that loads their working session via the
 * main reading page's deep-link (?session=<id>).
 */
function StudentAssignmentDetail({ assignment }: { assignment: Assignment }) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const progress = assignment.avgProgress ?? 0

  // Track that the student has viewed this assignment (fires once on mount)
  useEffect(() => {
    fetch(`/api/assignments/${assignment.id}/view`, { method: "POST" }).catch(() => {})
  }, [assignment.id])

  const ctaKey =
    progress === 0
      ? "assignments.studentView.start"
      : progress >= 100
        ? "assignments.studentView.review"
        : "assignments.studentView.continue"
  const studentSessionId = (assignment as Assignment & { studentSessionId?: string }).studentSessionId

  function handleStart() {
    if (studentSessionId) {
      router.push(`/?session=${encodeURIComponent(studentSessionId)}`)
    } else {
      router.push("/")
    }
  }

  return (
    <Card>
      <CardContent className="py-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("assignments.studentView.progress", { progress })}
            </div>
            <div className="mt-1 h-2 w-48 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {assignment.dueDate && (
            <span
              className={`inline-flex items-center gap-1 text-sm ${
                isOverdue(assignment.dueDate) ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isOverdue(assignment.dueDate) ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {t("assignments.studentView.overdue")}
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {t("assignments.studentView.due", {
                    date: formatDate(assignment.dueDate, i18n.language),
                  })}
                </>
              )}
            </span>
          )}
        </div>
        {assignment.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {assignment.description}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            {t("assignments.studentView.yourScores")}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(
              [
                {
                  key: "assignments.teacherView.testScoreCol",
                  value: assignment.testScore,
                  icon: <BookOpenCheck className="h-3 w-3 text-teal-500" />,
                },
                {
                  key: "assignments.teacherView.vocabCol",
                  value: assignment.vocabularyQuizScore,
                  icon: <ClipboardList className="h-3 w-3 text-blue-500" />,
                },
                {
                  key: "assignments.teacherView.spellingCol",
                  value: assignment.spellingGameAccuracy,
                  icon: <SpellCheck className="h-3 w-3 text-pink-500" />,
                },
                {
                  key: "assignments.teacherView.grammarQuizCol",
                  value: assignment.grammarQuizScore,
                  icon: <GraduationCap className="h-3 w-3 text-fuchsia-500" />,
                },
                {
                  key: "assignments.teacherView.grammarGameCol",
                  value: assignment.grammarGameAccuracy,
                  icon: <Gamepad2 className="h-3 w-3 text-amber-500" />,
                },
              ] as const
            ).map(({ key, value, icon }) => (
              <div
                key={key}
                className="rounded-lg border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {icon}
                  <span className="truncate">{t(key)}</span>
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {scoreCell(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button onClick={handleStart} disabled={!studentSessionId}>
          {ctaKey === "assignments.studentView.start" ? (
            <Play className="h-4 w-4 mr-1" />
          ) : ctaKey === "assignments.studentView.continue" ? (
            <ArrowRight className="h-4 w-4 mr-1" />
          ) : (
            <Eye className="h-4 w-4 mr-1" />
          )}
          {t(ctaKey)}
        </Button>
      </CardContent>
    </Card>
  )
}
