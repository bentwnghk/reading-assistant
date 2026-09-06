"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { useTranslation } from "react-i18next"
import { Loader2, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, FileText, BookMarked, ClipboardList, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { UserWithRole, StudentSessionData, SchoolInfo } from "@/lib/users"
import { exportStudentDataToExcel } from "@/utils/excelExport"
import { highlightTextAndSentences } from "@/utils/highlight"
import {
  tryParseMindMapData,
  mindMapDataToMermaid,
  pickMindMapSvg,
  colorizeMindMapSvg,
} from "@/utils/mindmap"

const MagicDown = dynamic(() => import("@/components/MagicDown/View"))

function isGrammarAnswerCorrect(q: GrammarQuizQuestion): boolean {
  if (q.type === "rewrite" || q.type === "fill-in") {
    return (q.earnedPoints ?? 0) >= q.points
  }
  const ua = q.userAnswer?.toLowerCase().trim()
  const ca = q.correctAnswer.toLowerCase().trim()
  return ua === ca || ua === ca.charAt(0)
}

function isReadingTestAnswerCorrect(q: ReadingTestQuestion): boolean {
  if (q.type === "short-answer") {
    return (q.earnedPoints ?? 0) >= q.points
  }
  const ua = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-")
  const ca = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-")
  if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
    return ua === ca || ua === ca.charAt(0)
  }
  return ua === ca
}

interface TeacherDataViewProps {
  isSuperAdmin: boolean
  isAdmin: boolean
}

type SortField = "date" | "teacher" | "school" | "title" | "progress" | "testScore" | "vocabularyCount" | "spellingScore" | "spellingAccuracy" | "quizScore" | "grammarQuizScore" | "grammarGameScore" | "grammarGameAccuracy"
type SortOrder = "asc" | "desc"
type DateRange = "7" | "30" | "90" | "180" | "360" | "all"

const DATE_RANGES: { value: DateRange; labelKey: string }[] = [
  { value: "7", labelKey: "userManagement.teacherData.dateRange.7days" },
  { value: "30", labelKey: "userManagement.teacherData.dateRange.30days" },
  { value: "90", labelKey: "userManagement.teacherData.dateRange.90days" },
  { value: "180", labelKey: "userManagement.teacherData.dateRange.180days" },
  { value: "360", labelKey: "userManagement.teacherData.dateRange.360days" },
  { value: "all", labelKey: "userManagement.teacherData.dateRange.allTime" },
]

function getStartDate(range: DateRange): Date | null {
  if (range === "all") return null
  const d = new Date()
  d.setDate(d.getDate() - parseInt(range, 10))
  return d
}

interface SessionWithSchool extends StudentSessionData {
  schoolName?: string
}

/**
 * Batches per-teacher session fetches (mirrors the Student Data tab's
 * STUDENT_FETCH_BATCH): each request costs a NextAuth DB session lookup +
 * pool client, so an unbounded parallel burst saturates the pg pool.
 */
const TEACHER_FETCH_BATCH = 5

export default function TeacherDataView({ isSuperAdmin, isAdmin: _isAdmin }: TeacherDataViewProps) {
  const { t, i18n } = useTranslation()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [teachers, setTeachers] = useState<UserWithRole[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all")
  const [sessions, setSessions] = useState<SessionWithSchool[]>([])
  const [spellingAttemptsByUser, setSpellingAttemptsByUser] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [exporting, setExporting] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>("7")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [viewingText, setViewingText] = useState<{
    id: string
    title: string
    teacher?: string
    text?: string
    highlightedWords?: string[]
    analyzedSentences?: Record<string, SentenceAnalysis>
    glossary?: GlossaryEntry[]
    adaptedText?: string
    simplifiedText?: string
    summary?: string
    mindMap?: string
    visualizationGeneratedAt?: number
  } | null>(null)
  // Visualization image is fetched on demand (first tab activation) — the
  // multi-MB base64 payload never rides along with the detail response.
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null)
  const [visualizationLoading, setVisualizationLoading] = useState(false)
  const [viewingGlossary, setViewingGlossary] = useState<{
    title: string
    teacher?: string
    glossary?: GlossaryEntry[]
  } | null>(null)
  const [textTab, setTextTab] = useState<string>("original")
  const [viewingQuiz, setViewingQuiz] = useState<{
    title: string
    teacher?: string
    score?: number
    questions?: VocabularyQuizQuestion[]
  } | null>(null)
  const [viewingGrammarQuiz, setViewingGrammarQuiz] = useState<{
    title: string
    teacher?: string
    score?: number
    questions?: GrammarQuizQuestion[]
  } | null>(null)
  const [viewingReadingTest, setViewingReadingTest] = useState<{
    title: string
    teacher?: string
    score?: number
    questions?: ReadingTestQuestion[]
  } | null>(null)

  const loadTeachersAndSchools = useCallback(async () => {
    try {
      const usersResponse = await fetch("/api/users")
      if (usersResponse.ok) {
        const users: UserWithRole[] = await usersResponse.json()
        setTeachers(users.filter(u => u.role === "teacher" && !u.banned))
      }

      if (isSuperAdmin) {
        const schoolsResponse = await fetch("/api/schools")
        if (schoolsResponse.ok) {
          setSchools(await schoolsResponse.json())
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t, isSuperAdmin])

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const teachersToLoad = selectedTeacherId === "all"
        ? teachers.filter(tc => selectedSchoolId === "all" || tc.schoolId === selectedSchoolId)
        : teachers.filter(tc => tc.id === selectedTeacherId)

      const allSessions: SessionWithSchool[] = []
      const attemptsMap: Record<string, number> = {}
      let failedTeacherFetches = 0

      // Bounded batches: avoid overwhelming the server connection pool when
      // "all teachers" means many parallel requests.
      for (let i = 0; i < teachersToLoad.length; i += TEACHER_FETCH_BATCH) {
        const batch = teachersToLoad.slice(i, i + TEACHER_FETCH_BATCH)
        const teacherResults = await Promise.all(batch.map(async (teacher) => {
          const res = await fetch(`/api/users/${teacher.id}/sessions`)
          if (res.ok) {
            const data = await res.json()
            const teacherSessions: StudentSessionData[] = data.sessions ?? []
            return {
              ok: true,
              sessions: teacherSessions.map((s: StudentSessionData) => ({
                ...s,
                schoolName: teacher.schoolName
              })),
              spellingReviewCount: data.spellingReviewCount ?? 0,
              userId: teacher.id,
            }
          }
          return { ok: false, sessions: [] as SessionWithSchool[], spellingReviewCount: 0, userId: teacher.id }
        }))

        for (const r of teacherResults) {
          if (!r.ok) failedTeacherFetches++
          allSessions.push(...r.sessions)
          attemptsMap[r.userId] = r.spellingReviewCount
        }
      }

      setSessions(allSessions)
      setSpellingAttemptsByUser(attemptsMap)
      // A failed per-teacher fetch otherwise looks like "no data" — surface it.
      if (failedTeacherFetches > 0) {
        toast.error(t("userManagement.teacherData.partialLoadFailed"))
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedTeacherId, selectedSchoolId, teachers, t])

  useEffect(() => {
    loadTeachersAndSchools()
  }, [loadTeachersAndSchools])

  useEffect(() => {
    if (teachers.length > 0) {
      loadSessions()
    } else {
      setSessions([])
      setSpellingAttemptsByUser({})
    }
  }, [selectedTeacherId, selectedSchoolId, teachers.length, loadSessions])

  const filteredAndSortedSessions = useMemo(() => {
    let result = [...sessions]

    const startDate = getStartDate(dateRange)
    if (startDate) {
      const startMs = startDate.getTime()
      result = result.filter(s => s.updatedAt >= startMs)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.userName?.toLowerCase().includes(query) ||
        s.userEmail?.toLowerCase().includes(query) ||
        s.docTitle.toLowerCase().includes(query)
      )
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "date":
          comparison = b.updatedAt - a.updatedAt
          break
        case "teacher":
          comparison = (a.userName || "").localeCompare(b.userName || "")
          break
        case "school":
          comparison = (a.schoolName || "").localeCompare(b.schoolName || "")
          break
        case "title":
          comparison = a.docTitle.localeCompare(b.docTitle)
          break
        case "progress":
          comparison = b.progress - a.progress
          break
        case "testScore":
          comparison = (b.testScore || 0) - (a.testScore || 0)
          break
        case "vocabularyCount":
          comparison = (b.glossaryCount || 0) - (a.glossaryCount || 0)
          break
        case "spellingScore":
          comparison = (b.spellingGameBestScore || 0) - (a.spellingGameBestScore || 0)
          break
        case "spellingAccuracy":
          comparison = (b.spellingGameAccuracy || 0) - (a.spellingGameAccuracy || 0)
          break
        case "quizScore":
          comparison = (b.vocabularyQuizScore || 0) - (a.vocabularyQuizScore || 0)
          break
        case "grammarQuizScore":
          comparison = (b.grammarQuizScore || 0) - (a.grammarQuizScore || 0)
          break
        case "grammarGameScore":
          comparison = (b.grammarGameBestScore || 0) - (a.grammarGameBestScore || 0)
          break
        case "grammarGameAccuracy":
          comparison = (b.grammarGameAccuracy || 0) - (a.grammarGameAccuracy || 0)
          break
      }
      return sortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [sessions, searchQuery, sortField, sortOrder, dateRange])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSessions.length / PAGE_SIZE))
  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredAndSortedSessions.slice(start, start + PAGE_SIZE)
  }, [filteredAndSortedSessions, page])

  useEffect(() => {
    setPage(1)
  }, [selectedTeacherId, selectedSchoolId, dateRange, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const exportData = async () => {
    if (exporting) return

    setExporting(true)
    try {
      const selectedSchool = selectedSchoolId !== "all"
        ? schools.find(s => s.id === selectedSchoolId)?.name
        : undefined
      const selectedTeacherUser = selectedTeacherId !== "all"
        ? teachers.find(tc => tc.id === selectedTeacherId)
        : undefined
      const selectedTeacher = selectedTeacherUser
        ? selectedTeacherUser.name || selectedTeacherUser.email || undefined
        : undefined

      await exportStudentDataToExcel({
        sessions: filteredAndSortedSessions,
        isAdmin: isSuperAdmin,
        schoolName: selectedSchool,
        teacherName: selectedTeacher,
        subjectLabel: "Teacher",
        spellingAttemptsByUser,
      })
    } catch (error) {
      console.error("Failed to export Excel:", error)
      toast.error(t("userManagement.teacherData.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const filteredTeachers = useMemo(() => {
    const scoped = isSuperAdmin && selectedSchoolId !== "all"
      ? teachers.filter(tc => tc.schoolId === selectedSchoolId)
      : teachers
    return [...scoped].sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || "")
    )
  }, [teachers, selectedSchoolId, isSuperAdmin])

  const highlightedTextHtml = useMemo(() => {
    if (!viewingText?.text) return ""
    const glossaryMap = new Map<string, GlossaryEntry>()
    for (const entry of viewingText.glossary || []) {
      glossaryMap.set(entry.word.toLowerCase(), entry)
    }
    const { html } = highlightTextAndSentences(
      viewingText.text,
      viewingText.highlightedWords || [],
      viewingText.analyzedSentences || {},
      glossaryMap
    )
    return html
  }, [viewingText])

  const hasHighlights = useMemo(() => {
    if (!viewingText) return false
    return (viewingText.highlightedWords?.length ?? 0) > 0 || Object.keys(viewingText.analyzedSentences || {}).length > 0
  }, [viewingText])

  const mindMapMarkdown = useMemo(() => {
    if (!viewingText?.mindMap) return null
    const parsed = tryParseMindMapData(viewingText.mindMap)
    return parsed ? mindMapDataToMermaid(parsed) : viewingText.mindMap
  }, [viewingText?.mindMap])

  const mindMapContentRef = useRef<HTMLDivElement>(null)

  // Colorize the Mermaid mindmap SVG after Mermaid finishes rendering — same
  // two-tone palette as the main-page Mind Map section (indigo root,
  // saturated branches, light-tint leaves). The diagram arrives at the end of
  // a chain of lazily-loaded chunks and async renders (MagicDown → Mermaid →
  // mermaid.render), and the exact ordering versus passive-effect timing
  // inside the dialog is a race — so besides the MutationObserver (for
  // immediacy) a short bounded poll re-resolves the container and retries
  // until the SVG is colorized, then stops. Inline-style writes don't
  // retrigger the childList observer.
  useEffect(() => {
    if (textTab !== "mindmap" || !viewingText?.mindMap) return
    const parsed = tryParseMindMapData(viewingText.mindMap)
    if (!parsed) return

    let colorized = false
    const tick = () => {
      if (colorized) return
      const container = mindMapContentRef.current
      if (!container) return
      const svg = pickMindMapSvg(container)
      if (svg && svg.querySelector("g.mindmap-node")) {
        colorizeMindMapSvg(svg, parsed)
        colorized = true
      }
    }

    tick()

    const observer = new MutationObserver(tick)
    if (mindMapContentRef.current) {
      observer.observe(mindMapContentRef.current, { childList: true, subtree: true })
    }

    const poll = window.setInterval(tick, 250)
    const deadline = window.setTimeout(() => {
      window.clearInterval(poll)
      observer.disconnect()
    }, 15000)

    return () => {
      window.clearInterval(poll)
      window.clearTimeout(deadline)
      observer.disconnect()
    }
  }, [textTab, viewingText?.mindMap])

  const handleViewText = useCallback(async (session: SessionWithSchool) => {
    setTextTab("original")
    setVisualizationImage(null)
    setVisualizationLoading(false)
    setViewingText({ id: session.id, title: session.docTitle, teacher: session.userName || undefined })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingText({
          id: session.id,
          title: session.docTitle,
          teacher: session.userName || undefined,
          text: detail.extractedText,
          highlightedWords: detail.highlightedWords,
          analyzedSentences: detail.analyzedSentences,
          glossary: detail.glossary,
          adaptedText: detail.adaptedText,
          simplifiedText: detail.simplifiedText,
          summary: detail.summary,
          mindMap: detail.mindMap,
          visualizationGeneratedAt: detail.visualizationGeneratedAt,
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  const handleViewGlossary = useCallback(async (session: SessionWithSchool) => {
    if (session.glossaryCount === 0) return
    setViewingGlossary({ title: session.docTitle, teacher: session.userName || undefined })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingGlossary({
          title: session.docTitle,
          teacher: session.userName || undefined,
          glossary: detail.glossary || [],
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  const handleViewQuiz = useCallback(async (session: SessionWithSchool) => {
    if ((session.vocabularyQuizScore ?? 0) === 0) return
    setViewingQuiz({ title: session.docTitle, teacher: session.userName || undefined, score: session.vocabularyQuizScore })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingQuiz({
          title: session.docTitle,
          teacher: session.userName || undefined,
          score: session.vocabularyQuizScore,
          questions: detail.vocabularyQuiz || [],
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  const handleViewGrammarQuiz = useCallback(async (session: SessionWithSchool) => {
    if (!session.grammarQuizCompleted || (session.grammarQuizScore || 0) === 0) return
    setViewingGrammarQuiz({ title: session.docTitle, teacher: session.userName || undefined, score: session.grammarQuizScore })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingGrammarQuiz({
          title: session.docTitle,
          teacher: session.userName || undefined,
          score: session.grammarQuizScore,
          questions: detail.grammarQuiz || [],
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  const handleViewReadingTest = useCallback(async (session: SessionWithSchool) => {
    if (!session.testCompleted || session.testScore === undefined) return
    setViewingReadingTest({ title: session.docTitle, teacher: session.userName || undefined, score: session.testScore })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingReadingTest({
          title: session.docTitle,
          teacher: session.userName || undefined,
          score: session.testScore,
          questions: detail.readingTest || [],
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("userManagement.teacherData.noTeachers")}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isSuperAdmin
          ? t("userManagement.teacherData.descriptionSuperAdmin")
          : t("userManagement.teacherData.descriptionAdmin")}
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select value={selectedSchoolId} onValueChange={(v) => {
            setSelectedSchoolId(v)
            setSelectedTeacherId("all")
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("userManagement.teacherData.selectSchool")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("userManagement.teacherData.allSchools")}</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t("userManagement.teacherData.selectTeacher")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("userManagement.teacherData.allTeachers")}</SelectItem>
            {filteredTeachers.map((tc) => (
              <SelectItem key={tc.id} value={tc.id}>
                {tc.name || tc.email || t("userManagement.users.noName")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("userManagement.teacherData.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-64"
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
        <div className="flex-1" />
        <Button onClick={exportData} variant="outline" size="sm" disabled={filteredAndSortedSessions.length === 0 || exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {exporting ? t("userManagement.teacherData.exporting") : t("userManagement.teacherData.export")}
        </Button>
      </div>

      {loadingSessions ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {t("userManagement.teacherData.showing", { count: filteredAndSortedSessions.length })}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {isSuperAdmin && (
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("school")}>
                      {t("userManagement.teacherData.school")}
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                )}
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("teacher")}>
                    {t("userManagement.teacherData.teacher")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("title")}>
                    {t("userManagement.teacherData.title")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("progress")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.progress")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("vocabularyCount")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.vocabulary")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("spellingScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.spelling")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("spellingAccuracy")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.spellingAccuracy")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("quizScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.quiz")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarQuizScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.grammarQuiz")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarGameScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.grammarGame")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarGameAccuracy")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.grammarGameAccuracy")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("testScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.teacherData.testScore")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("date")}>
                    {t("userManagement.teacherData.date")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSessions.map((session) => (
                <TableRow key={session.id}>
                  {isSuperAdmin && (
                    <TableCell>
                      <span className="text-sm">{session.schoolName || "-"}</span>
                    </TableCell>
                  )}
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.userName || t("userManagement.users.noName")}</div>
                      <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleViewText(session)}
                      className="block truncate max-w-xs text-left text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      title={`${t("userManagement.teacherData.viewReadingText")}: ${session.docTitle}`}
                    >
                      {session.docTitle}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={session.progress === 100 ? "default" : "secondary"}>
                      {session.progress}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleViewGlossary(session)}
                      className="inline-flex"
                      title={`${t("userManagement.teacherData.viewGlossary")}: ${session.docTitle}`}
                      disabled={session.glossaryCount === 0}
                    >
                      <Badge variant="outline" className={session.glossaryCount > 0 ? "cursor-pointer text-blue-600 dark:text-blue-400" : ""}>
                        {session.glossaryCount}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    {(session.spellingGameBestScore ?? 0) > 0 ? (
                      session.spellingGameBestScore
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(session.spellingGameAccuracy || 0) > 0 ? (
                      <Badge variant={session.spellingGameAccuracy! >= 70 ? "default" : "destructive"}>
                        {session.spellingGameAccuracy}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(session.vocabularyQuizScore ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleViewQuiz(session)}
                        className="inline-flex"
                        title={`${t("userManagement.teacherData.viewVocabQuiz")}: ${session.docTitle}`}
                      >
                        <Badge variant={session.vocabularyQuizScore! >= 70 ? "default" : "destructive"} className="cursor-pointer">
                          {session.vocabularyQuizScore}%
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.grammarQuizCompleted && (session.grammarQuizScore || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleViewGrammarQuiz(session)}
                        className="inline-flex"
                        title={`${t("userManagement.teacherData.viewGrammarQuiz")}: ${session.docTitle}`}
                      >
                        <Badge variant={(session.grammarQuizScore || 0) >= 70 ? "default" : "destructive"} className="cursor-pointer">
                          {session.grammarQuizScore}%
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(session.grammarGameBestScore || 0) > 0 ? (
                      <Badge variant={session.grammarGameBestScore! >= 70 ? "default" : "destructive"}>
                        {session.grammarGameBestScore}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(session.grammarGameAccuracy || 0) > 0 ? (
                      <Badge variant={session.grammarGameAccuracy! >= 70 ? "default" : "destructive"}>
                        {session.grammarGameAccuracy}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.testCompleted && session.testScore !== undefined ? (
                      <button
                        type="button"
                        onClick={() => handleViewReadingTest(session)}
                        className="inline-flex"
                        title={`${t("userManagement.teacherData.viewReadingTest")}: ${session.docTitle}`}
                      >
                        <Badge variant={session.testScore >= 70 ? "default" : "destructive"} className="cursor-pointer">
                          {session.testScore}%
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div>{new Date(session.updatedAt).toLocaleDateString(i18n.language, {
                      year: "numeric", month: "short", day: "numeric",
                    })}</div>
                    <div className="text-muted-foreground">{new Date(session.updatedAt).toLocaleTimeString(i18n.language, {
                      hour: "2-digit", minute: "2-digit",
                    })}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedSessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? t("userManagement.teacherData.noResults")
                : t("userManagement.teacherData.noSessions")}
            </div>
          )}
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

      <Dialog open={!!viewingText} onOpenChange={(open) => { if (!open) setViewingText(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">{viewingText?.title}</span>
            </DialogTitle>
            {viewingText?.teacher && (
              <DialogDescription>{viewingText.teacher}</DialogDescription>
            )}
          </DialogHeader>
          <Tabs
            value={textTab}
            onValueChange={(tab) => {
              setTextTab(tab)
              if (
                tab === "visualization" &&
                viewingText &&
                (viewingText.visualizationGeneratedAt ?? 0) > 0 &&
                visualizationImage === null &&
                !visualizationLoading
              ) {
                setVisualizationLoading(true)
                fetch(`/api/sessions/${viewingText.id}/visualization`)
                  .then(async (res) => {
                    if (!res.ok) throw new Error("Failed to load visualization")
                    const data: { image?: string } = await res.json()
                    setVisualizationImage(data.image || "")
                  })
                  .catch(() => toast.error(t("userManagement.loadFailed")))
                  .finally(() => setVisualizationLoading(false))
              }
            }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {viewingText?.text === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[true, !!viewingText?.adaptedText, !!viewingText?.simplifiedText, !!viewingText?.summary, !!viewingText?.mindMap, (viewingText?.visualizationGeneratedAt ?? 0) > 0].filter(Boolean).length}, minmax(0, 1fr))` }}>
                  <TabsTrigger value="original">{t("reading.adaptedText.originalTab")}</TabsTrigger>
                  {viewingText?.adaptedText && (
                    <TabsTrigger value="adapted">{t("reading.adaptedText.adaptedTab")}</TabsTrigger>
                  )}
                  {viewingText?.simplifiedText && (
                    <TabsTrigger value="simplified">{t("reading.adaptedText.simplifiedTab")}</TabsTrigger>
                  )}
                  {viewingText?.summary && (
                    <TabsTrigger value="summary">{t("userManagement.teacherData.summaryTab")}</TabsTrigger>
                  )}
                  {viewingText?.mindMap && (
                    <TabsTrigger value="mindmap">{t("userManagement.teacherData.mindMapTab")}</TabsTrigger>
                  )}
                  {viewingText && (viewingText.visualizationGeneratedAt ?? 0) > 0 && (
                    <TabsTrigger value="visualization">{t("userManagement.teacherData.visualizationTab")}</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="original" className="flex-1 overflow-y-auto mt-2">
                  {hasHighlights && (
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-muted-foreground pb-2 border-b">
                      <span className="flex items-center gap-1">
                        <mark className="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">&nbsp;</mark>
                        {t("userManagement.teacherData.legendVocabulary")}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="border-b-2 border-blue-500 dark:border-blue-400">&nbsp;&nbsp;</span>
                        {t("userManagement.teacherData.legendAnalyzedSentence")}
                      </span>
                    </div>
                  )}
                  <div
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightedTextHtml || t("userManagement.teacherData.noReadingText") }}
                  />
                </TabsContent>
                {viewingText?.adaptedText && (
                  <TabsContent value="adapted" className="flex-1 overflow-y-auto mt-2">
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {viewingText.adaptedText}
                    </div>
                  </TabsContent>
                )}
                {viewingText?.simplifiedText && (
                  <TabsContent value="simplified" className="flex-1 overflow-y-auto mt-2">
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {viewingText.simplifiedText}
                    </div>
                  </TabsContent>
                )}
                {viewingText?.summary && (
                  <TabsContent value="summary" className="flex-1 overflow-y-auto mt-2">
                    {/* MagicDown is lazy-loaded via next/dynamic with no Suspense
                        boundary of its own — a local boundary keeps the first
                        render's loading state scoped to this tab instead of
                        blanking the whole page (see Architectural Rules §B). */}
                    <Suspense
                      fallback={
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      }
                    >
                      <div className="prose prose-slate dark:prose-invert max-w-full text-[15px]">
                        <MagicDown disableMath>{viewingText.summary}</MagicDown>
                      </div>
                    </Suspense>
                  </TabsContent>
                )}
                {viewingText?.mindMap && (
                  <TabsContent value="mindmap" className="flex-1 overflow-y-auto mt-2">
                    {/* Radial (Mermaid) view only: structured data is converted
                        to a Mermaid mindmap; legacy markdown renders as-is. */}
                    {/* The ref div must live OUTSIDE the Suspense boundary: while
                        the MagicDown chunk loads, React unmounts everything
                        inside <Suspense> and shows the fallback — a ref on an
                        inner div is null at effect time, so the colorize
                        MutationObserver would never attach (the main page's
                        MindMap.tsx keeps its ref outside for the same
                        reason). */}
                    <div ref={mindMapContentRef} className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto">
                      <Suspense
                        fallback={
                          <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        }
                      >
                        <MagicDown hideMermaidDownload>
                          {mindMapMarkdown}
                        </MagicDown>
                      </Suspense>
                    </div>
                  </TabsContent>
                )}
                {viewingText && (viewingText.visualizationGeneratedAt ?? 0) > 0 && (
                  <TabsContent value="visualization" className="flex-1 overflow-y-auto mt-2">
                    {visualizationLoading || visualizationImage === null ? (
                      <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : visualizationImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={visualizationImage}
                        alt={viewingText.title}
                        className="mx-auto max-w-full h-auto rounded-md"
                      />
                    ) : null}
                  </TabsContent>
                )}
              </>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingGlossary} onOpenChange={(open) => { if (!open) setViewingGlossary(null) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <BookMarked className="h-5 w-5 shrink-0" />
              <span className="truncate">{viewingGlossary?.title}</span>
            </DialogTitle>
            {viewingGlossary?.teacher && viewingGlossary?.glossary && (
              <DialogDescription>
                {viewingGlossary.teacher} — {viewingGlossary.glossary.length} {t("userManagement.teacherData.vocabulary")}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-2">
            {viewingGlossary?.glossary === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : viewingGlossary.glossary.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[120px]">{t("reading.glossary.word")}</TableHead>
                    <TableHead className="w-[100px]">{t("reading.glossary.syllabification")}</TableHead>
                    <TableHead className="w-[80px]">{t("reading.glossary.partOfSpeech")}</TableHead>
                    <TableHead>{t("reading.glossary.englishDefinition")}</TableHead>
                    <TableHead className="w-[200px]">{t("reading.glossary.chineseDefinition")}</TableHead>
                    <TableHead>{t("reading.glossary.example")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingGlossary.glossary.map((entry) => (
                    <TableRow key={entry.word}>
                      <TableCell className="font-medium">{entry.word}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{entry.syllabification || "-"}</TableCell>
                      <TableCell className="text-muted-foreground italic text-xs">{entry.partOfSpeech || "-"}</TableCell>
                      <TableCell>{entry.englishDefinition}</TableCell>
                      <TableCell className="font-noto-sans-tc">{entry.chineseDefinition}</TableCell>
                      <TableCell className="text-muted-foreground italic">{entry.example || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("userManagement.teacherData.noGlossary")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingQuiz} onOpenChange={(open) => { if (!open) setViewingQuiz(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span className="truncate">{viewingQuiz?.title}</span>
              {viewingQuiz?.score !== undefined && (
                <Badge variant={viewingQuiz.score >= 70 ? "default" : "destructive"} className="ml-auto">
                  {viewingQuiz.score}%
                </Badge>
              )}
            </DialogTitle>
            {viewingQuiz?.teacher && (
              <DialogDescription>{viewingQuiz.teacher}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-2 space-y-3">
            {viewingQuiz?.questions === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : viewingQuiz.questions.length > 0 ? (
              viewingQuiz.questions.map((q, idx) => {
                const isCorrect = q.userAnswer === q.correctAnswer
                return (
                  <div key={q.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt) => {
                            const isUserAnswer = opt === q.userAnswer
                            const isCorrectAnswer = opt === q.correctAnswer
                            return (
                              <div
                                key={opt}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${
                                  isCorrectAnswer
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                                    : isUserAnswer
                                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                                {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                                <span>{opt}</span>
                              </div>
                            )
                          })}
                        </div>
                        {q.userAnswer === undefined && (
                          <p className="text-xs text-muted-foreground italic mt-1">{t("userManagement.teacherData.noAnswer")}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isCorrect ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("userManagement.teacherData.noVocabQuiz")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingGrammarQuiz} onOpenChange={(open) => { if (!open) setViewingGrammarQuiz(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span className="truncate">{viewingGrammarQuiz?.title}</span>
              {viewingGrammarQuiz?.score !== undefined && (
                <Badge variant={viewingGrammarQuiz.score >= 70 ? "default" : "destructive"} className="ml-auto">
                  {viewingGrammarQuiz.score}%
                </Badge>
              )}
            </DialogTitle>
            {viewingGrammarQuiz?.teacher && (
              <DialogDescription>{viewingGrammarQuiz.teacher}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-2 space-y-3">
            {viewingGrammarQuiz?.questions === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : viewingGrammarQuiz.questions.length > 0 ? (
              viewingGrammarQuiz.questions.map((q, idx) => {
                const hasOptions = q.options && q.options.length > 0
                const isCorrect = isGrammarAnswerCorrect(q)
                return (
                  <div key={q.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        {q.topicName && <span className="text-xs text-muted-foreground">{q.topicName}</span>}
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {hasOptions ? (
                            q.options!.map((opt) => {
                              const optLetter = opt.charAt(0).toUpperCase()
                              const isUserAnswer = opt === q.userAnswer || optLetter === q.userAnswer?.toUpperCase().trim()
                              const isCorrectAnswer = opt === q.correctAnswer || optLetter === q.correctAnswer.toUpperCase().trim()
                              return (
                                <div key={opt} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrectAnswer ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                                  {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                                  {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                                  <span>{opt}</span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="space-y-1">
                              {q.userAnswer !== undefined && (
                                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                                  {isCorrect ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                                  <span>{q.userAnswer}</span>
                                </div>
                              )}
                              {!isCorrect && (
                                <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>{q.correctAnswer}</span>
                                </div>
                              )}
                              {q.userAnswer === undefined && <p className="text-xs text-muted-foreground italic">{t("userManagement.teacherData.noAnswer")}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {isCorrect ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
                        {q.earnedPoints !== undefined && <span className="text-xs text-muted-foreground block mt-1">{q.earnedPoints}/{q.points}</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("userManagement.teacherData.noGrammarQuiz")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReadingTest} onOpenChange={(open) => { if (!open) setViewingReadingTest(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate">{viewingReadingTest?.title}</span>
              {viewingReadingTest?.score !== undefined && (
                <Badge variant={viewingReadingTest.score >= 70 ? "default" : "destructive"} className="ml-auto">
                  {viewingReadingTest.score}%
                </Badge>
              )}
            </DialogTitle>
            {viewingReadingTest?.teacher && (
              <DialogDescription>{viewingReadingTest.teacher}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-2 space-y-3">
            {viewingReadingTest?.questions === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : viewingReadingTest.questions.length > 0 ? (
              viewingReadingTest.questions.map((q, idx) => {
                const hasOptions = q.options && q.options.length > 0
                const isCorrect = isReadingTestAnswerCorrect(q)
                return (
                  <div key={q.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {hasOptions ? (
                            q.options!.map((opt) => {
                              const optLetter = opt.charAt(0).toUpperCase()
                              const isUserAnswer = opt === q.userAnswer || optLetter === q.userAnswer?.toUpperCase().trim()
                              const isCorrectAnswer = opt === q.correctAnswer || optLetter === q.correctAnswer.toUpperCase().trim()
                              return (
                                <div key={opt} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrectAnswer ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : isUserAnswer ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                                  {isCorrectAnswer && <Check className="h-3 w-3 shrink-0" />}
                                  {isUserAnswer && !isCorrectAnswer && <X className="h-3 w-3 shrink-0" />}
                                  <span>{opt}</span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="space-y-1">
                              {q.userAnswer !== undefined && (
                                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${isCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                                  {isCorrect ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                                  <span>{q.userAnswer}</span>
                                </div>
                              )}
                              {!isCorrect && (
                                <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>{q.correctAnswer}</span>
                                </div>
                              )}
                              {q.userAnswer === undefined && <p className="text-xs text-muted-foreground italic">{t("userManagement.teacherData.noAnswer")}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {isCorrect ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
                        {q.earnedPoints !== undefined && <span className="text-xs text-muted-foreground block mt-1">{q.earnedPoints}/{q.points}</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("userManagement.teacherData.noReadingTest")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
