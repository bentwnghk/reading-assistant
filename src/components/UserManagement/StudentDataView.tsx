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
import type { ClassInfo, StudentSessionData, SchoolInfo } from "@/lib/users"
import { exportStudentDataToExcel } from "@/utils/excelExport"

interface StudentDataViewProps {
  isAdmin: boolean
  currentUserId?: string
}

type SortField = "date" | "student" | "school" | "progress" | "testScore" | "vocabularyCount" | "spellingScore" | "quizScore"
type SortOrder = "asc" | "desc"

interface SessionWithSchool extends StudentSessionData {
  schoolName?: string
}

export default function StudentDataView({ isAdmin, currentUserId: _currentUserId }: StudentDataViewProps) {
  const { t } = useTranslation()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionWithSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [exporting, setExporting] = useState(false)

  const loadClassesAndSchools = useCallback(async () => {
    try {
      const classesResponse = await fetch("/api/classes")
      if (classesResponse.ok) {
        const data: ClassInfo[] = await classesResponse.json()
        setClasses(data)
        if (data.length > 0 && !selectedClassId) {
          if (isAdmin) {
            setSelectedClassId("all")
          } else {
            setSelectedClassId(data[0].id)
          }
        }
      }

      if (isAdmin) {
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
  }, [selectedClassId, t, isAdmin])

  const loadSessions = useCallback(async () => {
    if (!selectedClassId) return

    setLoadingSessions(true)
    try {
      const classesToLoad = selectedClassId === "all"
        ? classes.filter(c => selectedSchoolId === "all" || c.schoolId === selectedSchoolId)
        : classes.filter(c => c.id === selectedClassId)

      const allSessions: SessionWithSchool[] = []

      for (const cls of classesToLoad) {
        const response = await fetch(`/api/classes/${cls.id}/members`)
        if (!response.ok) continue

        const members = await response.json()
        const sessionPromises = members.map(async (member: { studentId: string }) => {
          const res = await fetch(`/api/classes/${cls.id}/students/${member.studentId}/sessions`)
          if (res.ok) {
            const sessions = await res.json()
            return sessions.map((s: StudentSessionData) => ({
              ...s,
              schoolName: cls.schoolName
            }))
          }
          return []
        })

        const sessionArrays = await Promise.all(sessionPromises)
        allSessions.push(...sessionArrays.flat())
      }

      setSessions(allSessions)
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
        isAdmin,
        schoolName: selectedSchool,
        className: selectedClass,
      })
    } catch (error) {
      console.error("Failed to export Excel:", error)
      toast.error(t("userManagement.studentData.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const filteredClasses = useMemo(() => {
    if (!isAdmin || selectedSchoolId === "all") return classes
    return classes.filter(c => c.schoolId === selectedSchoolId)
  }, [classes, selectedSchoolId, isAdmin])

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
          {isAdmin && (
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
              {isAdmin && (
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
        </div>
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
                {isAdmin && (
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
                  {isAdmin && (
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
