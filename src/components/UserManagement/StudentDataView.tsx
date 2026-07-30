"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, FileText, BookMarked } from "lucide-react"
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
import type { ClassInfo, StudentSessionData, SchoolInfo } from "@/lib/users"
import { exportStudentDataToExcel } from "@/utils/excelExport"
import { highlightTextAndSentences } from "@/utils/highlight"

interface StudentDataViewProps {
  isSuperAdmin: boolean
  isAdmin: boolean
  currentUserId?: string
}

type SortField = "date" | "student" | "school" | "title" | "progress" | "testScore" | "vocabularyCount" | "spellingScore" | "spellingAccuracy" | "quizScore" | "grammarQuizScore" | "grammarGameScore" | "grammarGameAccuracy"
type SortOrder = "asc" | "desc"
type DateRange = "7" | "30" | "90" | "180" | "360" | "all"

const DATE_RANGES: { value: DateRange; labelKey: string }[] = [
  { value: "7", labelKey: "userManagement.studentData.dateRange.7days" },
  { value: "30", labelKey: "userManagement.studentData.dateRange.30days" },
  { value: "90", labelKey: "userManagement.studentData.dateRange.90days" },
  { value: "180", labelKey: "userManagement.studentData.dateRange.180days" },
  { value: "360", labelKey: "userManagement.studentData.dateRange.360days" },
  { value: "all", labelKey: "userManagement.studentData.dateRange.allTime" },
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

export default function StudentDataView({ isSuperAdmin, isAdmin, currentUserId: _currentUserId }: StudentDataViewProps) {
  const { t, i18n } = useTranslation()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
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
    title: string
    student?: string
    text?: string
    highlightedWords?: string[]
    analyzedSentences?: Record<string, SentenceAnalysis>
    glossary?: GlossaryEntry[]
    adaptedText?: string
    simplifiedText?: string
  } | null>(null)
  const [viewingGlossary, setViewingGlossary] = useState<{
    title: string
    student?: string
    glossary?: GlossaryEntry[]
  } | null>(null)
  const [textTab, setTextTab] = useState<string>("original")

  const _isTeacher = !isSuperAdmin && !isAdmin

  const loadClassesAndSchools = useCallback(async () => {
    try {
      const classesResponse = await fetch("/api/classes")
      if (classesResponse.ok) {
        const data: ClassInfo[] = await classesResponse.json()
        setClasses(data)
        if (data.length > 0 && !selectedClassId) {
          if (isSuperAdmin || isAdmin) {
            setSelectedClassId("all")
          } else {
            setSelectedClassId(data[0].id)
          }
        }
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
  }, [selectedClassId, t, isSuperAdmin, isAdmin])

  const loadSessions = useCallback(async () => {
    if (!selectedClassId) return

    setLoadingSessions(true)
    try {
      const classesToLoad = selectedClassId === "all"
        ? classes.filter(c => selectedSchoolId === "all" || c.schoolId === selectedSchoolId)
        : classes.filter(c => c.id === selectedClassId)

      const allSessions: SessionWithSchool[] = []
      const attemptsMap: Record<string, number> = {}

      for (const cls of classesToLoad) {
        const response = await fetch(`/api/classes/${cls.id}/members`)
        if (!response.ok) continue

        const members = await response.json()
        const studentDataPromises = members.map(async (member: { studentId: string }) => {
          const res = await fetch(`/api/classes/${cls.id}/students/${member.studentId}/sessions`)
          if (res.ok) {
            const data = await res.json()
            const studentSessions: StudentSessionData[] = data.sessions ?? data
            return {
              sessions: studentSessions.map((s: StudentSessionData) => ({
                ...s,
                schoolName: cls.schoolName
              })),
              spellingReviewCount: data.spellingReviewCount ?? 0,
              userId: member.studentId,
            }
          }
          return { sessions: [] as SessionWithSchool[], spellingReviewCount: 0, userId: member.studentId }
        })

        const studentResults = await Promise.all(studentDataPromises)
        for (const r of studentResults) {
          allSessions.push(...r.sessions)
          attemptsMap[r.userId] = r.spellingReviewCount
        }
      }

      setSessions(allSessions)
      setSpellingAttemptsByUser(attemptsMap)
    } catch (error) {
      console.error("Failed to load sessions:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedClassId, selectedSchoolId, classes, t])

  useEffect(() => {
    loadClassesAndSchools()
  }, [loadClassesAndSchools])

  useEffect(() => {
    if (selectedClassId && classes.length > 0) {
      loadSessions()
    }
  }, [selectedClassId, selectedSchoolId, classes.length, loadSessions])

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
        case "student":
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
  }, [selectedClassId, selectedSchoolId, dateRange, searchQuery, sortField, sortOrder])

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
      const selectedClass = selectedClassId !== "all" 
        ? classes.find(c => c.id === selectedClassId)?.name 
        : undefined
      
      await exportStudentDataToExcel({
        sessions: filteredAndSortedSessions,
        isAdmin: isSuperAdmin || isAdmin,
        schoolName: selectedSchool,
        className: selectedClass,
        spellingAttemptsByUser,
      })
    } catch (error) {
      console.error("Failed to export Excel:", error)
      toast.error(t("userManagement.studentData.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const filteredClasses = useMemo(() => {
    if (!isSuperAdmin || selectedSchoolId === "all") return classes
    return classes.filter(c => c.schoolId === selectedSchoolId)
  }, [classes, selectedSchoolId, isSuperAdmin])

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

  const handleViewText = useCallback(async (session: SessionWithSchool) => {
    setTextTab("original")
    setViewingText({ title: session.docTitle, student: session.userName || undefined })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingText({
          title: session.docTitle,
          student: session.userName || undefined,
          text: detail.extractedText,
          highlightedWords: detail.highlightedWords,
          analyzedSentences: detail.analyzedSentences,
          glossary: detail.glossary,
          adaptedText: detail.adaptedText,
          simplifiedText: detail.simplifiedText,
        })
      }
    } catch {
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t])

  const handleViewGlossary = useCallback(async (session: SessionWithSchool) => {
    if (session.glossaryCount === 0) return
    setViewingGlossary({ title: session.docTitle, student: session.userName || undefined })
    try {
      const res = await fetch(`/api/sessions/${session.id}/detail`)
      if (res.ok) {
        const detail: StudentSessionData = await res.json()
        setViewingGlossary({
          title: session.docTitle,
          student: session.userName || undefined,
          glossary: detail.glossary || [],
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

  if (classes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("userManagement.studentData.noClasses")}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isSuperAdmin 
          ? t("userManagement.studentData.descriptionSuperAdmin")
          : isAdmin
            ? t("userManagement.studentData.descriptionAdmin")
            : t("userManagement.studentData.descriptionTeacher")}
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select value={selectedSchoolId} onValueChange={(v) => {
            setSelectedSchoolId(v)
            setSelectedClassId("all")
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("userManagement.studentData.selectSchool")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("userManagement.studentData.allSchools")}</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("userManagement.studentData.selectClass")} />
          </SelectTrigger>
          <SelectContent>
            {(isSuperAdmin || isAdmin) && (
              <SelectItem value="all">{t("userManagement.studentData.allClasses")}</SelectItem>
            )}
            {filteredClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.studentCount || 0} {t("userManagement.studentData.students")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("userManagement.studentData.search")}
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
          {exporting ? t("userManagement.studentData.exporting") : t("userManagement.studentData.export")}
        </Button>
      </div>

      {loadingSessions ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {t("userManagement.studentData.showing", { count: filteredAndSortedSessions.length })}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {isSuperAdmin && (
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("school")}>
                      {t("userManagement.studentData.school")}
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                )}
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("student")}>
                    {t("userManagement.studentData.student")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("title")}>
                    {t("userManagement.studentData.title")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("progress")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.progress")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("vocabularyCount")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.vocabulary")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("spellingScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.spelling")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("spellingAccuracy")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.spellingAccuracy")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("quizScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.quiz")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarQuizScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.grammarQuiz")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarGameScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.grammarGame")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("grammarGameAccuracy")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.grammarGameAccuracy")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("testScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.testScore")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("date")}>
                    {t("userManagement.studentData.date")}
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
                      title={`${t("userManagement.studentData.viewReadingText")}: ${session.docTitle}`}
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
                      title={`${t("userManagement.studentData.viewGlossary")}: ${session.docTitle}`}
                      disabled={session.glossaryCount === 0}
                    >
                      <Badge variant="outline" className={session.glossaryCount > 0 ? "cursor-pointer hover:bg-accent text-blue-600 dark:text-blue-400" : ""}>
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
                      <Badge variant={session.vocabularyQuizScore! >= 70 ? "default" : "destructive"}>
                        {session.vocabularyQuizScore}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.grammarQuizCompleted && (session.grammarQuizScore || 0) > 0 ? (
                      <Badge variant={(session.grammarQuizScore || 0) >= 70 ? "default" : "destructive"}>
                        {session.grammarQuizScore}%
                      </Badge>
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
                      <Badge variant={session.testScore >= 70 ? "default" : "destructive"}>
                        {session.testScore}%
                      </Badge>
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
                ? t("userManagement.studentData.noResults")
                : t("userManagement.studentData.noSessions")}
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
            {viewingText?.student && (
              <DialogDescription>{viewingText.student}</DialogDescription>
            )}
          </DialogHeader>
          <Tabs value={textTab} onValueChange={setTextTab} className="flex-1 flex flex-col overflow-hidden">
            {viewingText?.text === undefined ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[true, !!viewingText?.adaptedText, !!viewingText?.simplifiedText].filter(Boolean).length}, minmax(0, 1fr))` }}>
                  <TabsTrigger value="original">{t("reading.adaptedText.originalTab")}</TabsTrigger>
                  {viewingText?.adaptedText && (
                    <TabsTrigger value="adapted">{t("reading.adaptedText.adaptedTab")}</TabsTrigger>
                  )}
                  {viewingText?.simplifiedText && (
                    <TabsTrigger value="simplified">{t("reading.adaptedText.simplifiedTab")}</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="original" className="flex-1 overflow-y-auto mt-2">
                  {hasHighlights && (
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-muted-foreground pb-2 border-b">
                      <span className="flex items-center gap-1">
                        <mark className="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">&nbsp;</mark>
                        {t("userManagement.studentData.legendVocabulary")}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="border-b-2 border-blue-500 dark:border-blue-400">&nbsp;&nbsp;</span>
                        {t("userManagement.studentData.legendAnalyzedSentence")}
                      </span>
                    </div>
                  )}
                  <div
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightedTextHtml || t("userManagement.studentData.noReadingText") }}
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
            {viewingGlossary?.student && viewingGlossary?.glossary && (
              <DialogDescription>
                {viewingGlossary.student} — {viewingGlossary.glossary.length} {t("userManagement.studentData.vocabulary")}
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
                {t("userManagement.studentData.noGlossary")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
