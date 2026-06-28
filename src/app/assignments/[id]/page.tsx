"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  Users,
  Loader2,
  Download,
  Eye,
  TrendingUp,
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

function isOverdue(iso?: string | null): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

function scoreCell(score: number | null | undefined): string {
  if (score == null) return "-"
  return String(score)
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
              <div className="min-w-0 flex-1">
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

        {/* Teacher: roster table; Student: rendered by StudentAssignmentDetail below */}
        {isTeacher ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("assignments.teacherView.student") || "Student"}</TableHead>
                    <TableHead className="w-24">{t("assignments.teacherView.progressCol")}</TableHead>
                    <TableHead className="w-20">{t("assignments.teacherView.testScoreCol")}</TableHead>
                    <TableHead className="w-20">{t("assignments.teacherView.vocabCol")}</TableHead>
                    <TableHead className="w-20">{t("assignments.teacherView.spellingCol")}</TableHead>
                    <TableHead className="w-20">{t("assignments.teacherView.grammarQuizCol")}</TableHead>
                    <TableHead className="w-20">{t("assignments.teacherView.grammarGameCol")}</TableHead>
                    <TableHead className="w-32">{t("assignments.teacherView.lastViewedCol")}</TableHead>
                    <TableHead className="w-16">{t("assignments.teacherView.actionsCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t("assignments.teacherView.notStarted")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    roster.map((s) => (
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
                        <TableCell className="tabular-nums">{scoreCell(s.spellingGameBestScore)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.grammarQuizScore)}</TableCell>
                        <TableCell className="tabular-nums">{scoreCell(s.grammarGameBestScore)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.lastViewedAt
                            ? formatDate(s.lastViewedAt, i18n.language)
                            : t("assignments.teacherView.never")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("assignments.teacherView.viewWork")}
                            onClick={() =>
                              window.open(
                                `/?viewSession=${encodeURIComponent(s.studentSessionId ?? "")}&assignment=${encodeURIComponent(assignment.id)}&student=${encodeURIComponent(s.studentId)}`,
                                "_blank",
                              )
                            }
                            disabled={!s.studentSessionId}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
            <div className="text-sm text-muted-foreground">
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
              className={`text-sm ${
                isOverdue(assignment.dueDate) ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isOverdue(assignment.dueDate)
                ? t("assignments.studentView.overdue")
                : t("assignments.studentView.due", {
                    date: formatDate(assignment.dueDate, i18n.language),
                  })}
            </span>
          )}
        </div>
        {assignment.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {assignment.description}
          </p>
        )}
        <Button onClick={handleStart} disabled={!studentSessionId}>
          {t(ctaKey)}
        </Button>
      </CardContent>
    </Card>
  )
}
