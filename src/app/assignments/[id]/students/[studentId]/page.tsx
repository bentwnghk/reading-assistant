"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDateLong } from "@/utils/formatDate"

const MagicDown = dynamic(() => import("@/components/MagicDown/View"), { ssr: false })

interface SubmissionDetail {
  submission: AssignmentSubmissionShape
  sessionRow: Record<string, unknown>
}

interface AssignmentSubmissionShape {
  id: string
  assignmentId: string
  studentId: string
  studentName?: string | null
  studentEmail?: string | null
  studentImage?: string | null
  studentSessionId?: string | null
  progress: number
  testScore?: number | null
  testCompleted: boolean
  vocabularyQuizScore?: number | null
  spellingGameBestScore?: number | null
  grammarQuizScore?: number | null
  grammarGameBestScore?: number | null
  grammarGameAccuracy?: number | null
  lastViewedAt?: string | null
  submittedAt?: string | null
  createdAt: string
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null
}
function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export default function StudentSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { id, studentId } = await params
      try {
        const res = await fetch(`/api/assignments/${id}/submissions/${studentId}`)
        if (cancelled) return
        if (res.status === 403) {
          setForbidden(true)
          return
        }
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error("Failed")
        const data: SubmissionDetail = await res.json()
        setDetail(data)
      } catch {
        if (!cancelled) toast.error(t("assignments.error.loadFailed"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params, t])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t("assignments.error.forbidden")}</p>
        <Link href="/assignments">
          <Button variant="outline">{t("assignments.back")}</Button>
        </Link>
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{t("assignments.error.notFound")}</p>
        <Link href="/assignments">
          <Button variant="outline">{t("assignments.back")}</Button>
        </Link>
      </div>
    )
  }

  const { submission: s, sessionRow: session } = detail

  // Read fields defensively from the raw session row.
  const extractedText = asString(session.extracted_text)
  const summary = asString(session.summary)
  const adaptedText = asString(session.adapted_text)
  const mindMap = asString(session.mind_map)
  const docTitle = asString(session.doc_title)
  const testScore = asNumber(session.test_score)
  const testCompleted = Boolean(session.test_completed)
  const readingTest = asArray<{ question?: string; userAnswer?: unknown; correct?: boolean; questionType?: string }>(session.reading_test)
  const glossary = asArray<{ word?: string; partOfSpeech?: string; englishDefinition?: string; chineseDefinition?: string }>(session.glossary)
  const chatHistory = asArray<{ role?: string; content?: string }>(session.chat_history)

  const stats: Array<[string, string]> = [
    [t("assignments.teacherView.progressCol"), `${s.progress}%`],
    [t("assignments.teacherView.testScoreCol"), s.testScore != null ? String(s.testScore) : "-"],
    [t("assignments.teacherView.vocabCol"), s.vocabularyQuizScore != null ? String(s.vocabularyQuizScore) : "-"],
    [t("assignments.teacherView.spellingCol"), s.spellingGameBestScore != null ? String(s.spellingGameBestScore) : "-"],
    [t("assignments.teacherView.grammarQuizCol"), s.grammarQuizScore != null ? String(s.grammarQuizScore) : "-"],
    [t("assignments.teacherView.grammarGameCol"), s.grammarGameBestScore != null ? String(s.grammarGameBestScore) : "-"],
    ...(s.grammarGameAccuracy != null
      ? [[t("assignments.teacherView.accuracyCol"), `${s.grammarGameAccuracy}%`] as [string, string]]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/assignments/${s.assignmentId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("assignments.submission.backToRoster")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={s.studentImage || undefined} />
                  <AvatarFallback>
                    {s.studentName?.[0] || s.studentEmail?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate">
                    {t("assignments.submission.title", { student: s.studentName || s.studentEmail || "—" })}
                  </CardTitle>
                  {docTitle && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {docTitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {testCompleted ? (
                  <Badge variant="default">{t("assignments.teacherView.testScoreCol")}: {testScore ?? "-"}</Badge>
                ) : (
                  <Badge variant="secondary">{t("assignments.teacherView.notStarted")}</Badge>
                )}
                {s.submittedAt && (
                  <Badge variant="outline">
                    {t("assignments.teacherView.submittedCol")}: {formatDateLong(s.submittedAt, i18n.language)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-lg font-semibold tabular-nums">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {extractedText && (
          <Card>
            <CardHeader>
              <CardTitle>{t("history.extractedText") || "Extracted text"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {extractedText}
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reading.summary") || "Summary"}</CardTitle>
            </CardHeader>
            <CardContent>
              <MagicDown>{summary}</MagicDown>
            </CardContent>
          </Card>
        )}

        {adaptedText && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reading.adaptedText") || "Adapted text"}</CardTitle>
            </CardHeader>
            <CardContent>
              <MagicDown>{adaptedText}</MagicDown>
            </CardContent>
          </Card>
        )}

        {mindMap && (
          <Card>
            <CardHeader>
              <CardTitle>{t("reading.mindMap") || "Mind map"}</CardTitle>
            </CardHeader>
            <CardContent>
              <MagicDown>{mindMap}</MagicDown>
            </CardContent>
          </Card>
        )}

        {readingTest.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("assignments.submission.readingTest")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {readingTest.map((q, i) => {
                const answered = q.userAnswer !== undefined && q.userAnswer !== null && q.userAnswer !== ""
                return (
                  <div key={i} className="rounded-md border p-3 space-y-1.5">
                    <div className="text-sm font-medium">
                      {i + 1}. {q.question || "(no question)"}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {t("history.userAnswer") || "Your answer"}:
                      </span>{" "}
                      <span className={answered ? "" : "text-muted-foreground italic"}>
                        {answered ? String(q.userAnswer) : (t("assignments.teacherView.notStarted"))}
                      </span>
                      {q.correct === true && (
                        <Badge variant="outline" className="ml-2 text-green-600 border-green-300">✓</Badge>
                      )}
                      {q.correct === false && (
                        <Badge variant="outline" className="ml-2 text-red-600 border-red-300">✗</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {glossary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("assignments.submission.glossary")} ({glossary.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {glossary.map((g, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    <div className="font-medium">{g.word}</div>
                    {g.partOfSpeech && (
                      <div className="text-xs italic text-muted-foreground">{g.partOfSpeech}</div>
                    )}
                    {g.englishDefinition && (
                      <div className="text-sm">{g.englishDefinition}</div>
                    )}
                    {g.chineseDefinition && (
                      <div className="text-sm text-muted-foreground">{g.chineseDefinition}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {chatHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("assignments.submission.chatHistory")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chatHistory.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-md p-2 ${
                    m.role === "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <MagicDown>{m.content || ""}</MagicDown>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
