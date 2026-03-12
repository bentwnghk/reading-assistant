"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Search, ArrowUpDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { toast } from "sonner"
import dayjs from "dayjs"
import type { ClassInfo, StudentSessionData } from "@/lib/users"

interface StudentDataViewProps {
  isAdmin: boolean
  currentUserId?: string
}

type SortField = "date" | "student" | "progress" | "testScore" | "vocabularyCount" | "spellingScore" | "quizScore"
type SortOrder = "asc" | "desc"

export default function StudentDataView({ isAdmin: _isAdmin, currentUserId: _currentUserId }: StudentDataViewProps) {
  const { t } = useTranslation()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [sessions, setSessions] = useState<StudentSessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes")
      if (response.ok) {
        const data: ClassInfo[] = await response.json()
        setClasses(data)
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load classes:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, t])

  const loadSessions = useCallback(async () => {
    if (!selectedClassId) return

    setLoadingSessions(true)
    try {
      const response = await fetch(`/api/classes/${selectedClassId}/members`)
      if (!response.ok) {
        toast.error(t("userManagement.loadFailed"))
        setLoadingSessions(false)
        return
      }

      const members = await response.json()
      const sessionPromises = members.map(async (member: { studentId: string }) => {
        const res = await fetch(`/api/classes/${selectedClassId}/students/${member.studentId}/sessions`)
        if (res.ok) {
          return res.json()
        }
        return []
      })

      const sessionArrays = await Promise.all(sessionPromises)
      const allSessions = sessionArrays.flat()
      setSessions(allSessions)
    } catch (error) {
      console.error("Failed to load sessions:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedClassId, t])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    if (selectedClassId) {
      loadSessions()
    }
  }, [selectedClassId, loadSessions])

  const filteredAndSortedSessions = useMemo(() => {
    let result = [...sessions]

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
        case "quizScore":
          comparison = (b.vocabularyQuizScore || 0) - (a.vocabularyQuizScore || 0)
          break
      }
      return sortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [sessions, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const exportData = () => {
    const csvContent = [
      ["Student", "Email", "Reading Text", "Learning Progress", "Reading Test", "Vocabulary Count", "Spelling Challenge", "Vocabulary Quiz", "Last Update"].join(","),
      ...filteredAndSortedSessions.map(s => [
        s.userName || "",
        s.userEmail || "",
        `"${s.docTitle.replace(/"/g, '""')}"`,
        `${s.progress}%`,
        s.testCompleted ? `${s.testScore}%` : "-",
        s.glossaryCount,
        s.spellingGameBestScore || 0,
        s.vocabularyQuizScore || 0,
        dayjs(s.updatedAt).format("YYYY-MM-DD HH:mm"),
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ProReader-student-data-${dayjs().format("YYYY-MM-DD")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("userManagement.studentData.selectClass")} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
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
        </div>
        <Button onClick={exportData} variant="outline" size="sm" disabled={filteredAndSortedSessions.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          {t("userManagement.studentData.export")}
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
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("student")}>
                    {t("userManagement.studentData.student")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>{t("userManagement.studentData.title")}</TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("progress")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.progress")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-center whitespace-normal break-words">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("testScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.testScore")}
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
                  <Button variant="ghost" size="sm" onClick={() => handleSort("quizScore")} className="h-auto py-1 whitespace-normal">
                    {t("userManagement.studentData.quiz")}
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
              {filteredAndSortedSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.userName || t("userManagement.users.noName")}</div>
                      <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="truncate block max-w-48" title={session.docTitle}>
                      {session.docTitle}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={session.progress === 100 ? "default" : "secondary"}>
                      {session.progress}%
                    </Badge>
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
                  <TableCell className="text-center">
                    <Badge variant="outline">{session.glossaryCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {session.spellingGameBestScore || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.vocabularyQuizScore || 0}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {dayjs(session.updatedAt).format("MM/DD HH:mm")}
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
        </>
      )}
    </div>
  )
}
