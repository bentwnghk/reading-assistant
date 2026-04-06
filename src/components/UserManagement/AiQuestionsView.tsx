"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import dynamic from "next/dynamic"
import { Loader2, Search, ChevronDown, ChevronRight, ChevronLeft, MessageCircle, Users, FileText, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DateRange = "7" | "30" | "90" | "180" | "360" | "all"

const DATE_RANGES: { value: DateRange; labelKey: string }[] = [
  { value: "7", labelKey: "userManagement.aiQuestions.dateRange.7days" },
  { value: "30", labelKey: "userManagement.aiQuestions.dateRange.30days" },
  { value: "90", labelKey: "userManagement.aiQuestions.dateRange.90days" },
  { value: "180", labelKey: "userManagement.aiQuestions.dateRange.180days" },
  { value: "360", labelKey: "userManagement.aiQuestions.dateRange.360days" },
  { value: "all", labelKey: "userManagement.aiQuestions.dateRange.allTime" },
]

function getStartDate(range: DateRange): Date | null {
  if (range === "all") return null
  const d = new Date()
  d.setDate(d.getDate() - parseInt(range, 10))
  return d
}
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
import type { ClassInfo, SchoolInfo } from "@/lib/users"

const View = dynamic(() => import("@/components/MagicDown/View"), { ssr: false })

interface AggregatedQuestion {
  questionHash: string
  questionText: string
  frequency: number
  lastAsked: number
  uniqueUserCount: number
}

interface QuestionInstance {
  id: string
  questionText: string
  responseText?: string | null
  docTitle?: string | null
  createdAt: number
  userId: string
  userName?: string | null
  userEmail?: string | null
}

interface AiQuestionsViewProps {
  isSuperAdmin: boolean
  isAdmin: boolean
}

export default function AiQuestionsView({ isSuperAdmin, isAdmin }: AiQuestionsViewProps) {
  const { t, i18n } = useTranslation()
  const isTeacher = !isSuperAdmin && !isAdmin
  
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange>("7")
  const [questions, setQuestions] = useState<AggregatedQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set())
  const [instancesCache, setInstancesCache] = useState<Map<string, QuestionInstance[]>>(new Map())
  const [loadingInstances, setLoadingInstances] = useState<Set<string>>(new Set())
  const [initializedTeacherClass, setInitializedTeacherClass] = useState(false)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<"question" | "frequency" | "users" | "lastAsked">("frequency")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const PAGE_SIZE = 20

  const loadInitialData = useCallback(async () => {
    try {
      const [classesRes, schoolsRes] = await Promise.all([
        fetch("/api/classes"),
        isSuperAdmin ? fetch("/api/schools") : null,
      ])

      if (classesRes.ok) {
        const data: ClassInfo[] = await classesRes.json()
        setClasses(data)
        
        if (isTeacher && data.length > 0 && !initializedTeacherClass) {
          setSelectedClassId(data[0].id)
          setInitializedTeacherClass(true)
        }
      }

      if (schoolsRes && schoolsRes.ok) {
        setSchools(await schoolsRes.json())
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t, isSuperAdmin, isTeacher, initializedTeacherClass])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (selectedSchoolId && selectedSchoolId !== "all") {
        params.set("schoolId", selectedSchoolId)
      }
      if (selectedClassId && selectedClassId !== "all") {
        params.set("classId", selectedClassId)
      }

      const startDate = getStartDate(dateRange)
      if (startDate) {
        params.set("startDate", startDate.toISOString())
      }

      const response = await fetch(`/api/chat-questions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
        setTotal(data.total || 0)
      } else {
        throw new Error("Failed to fetch")
      }
    } catch (error) {
      console.error("Failed to load questions:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [selectedSchoolId, selectedClassId, dateRange, t])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    loadQuestions()
    setExpandedHashes(new Set())
    setInstancesCache(new Map())
  }, [loadQuestions])

  const filteredQuestions = useMemo(() => {
    const result = searchQuery
      ? questions.filter(q => q.questionText.toLowerCase().includes(searchQuery.toLowerCase()))
      : questions

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "question":
          comparison = a.questionText.localeCompare(b.questionText)
          break
        case "frequency":
          comparison = b.frequency - a.frequency
          break
        case "users":
          comparison = b.uniqueUserCount - a.uniqueUserCount
          break
        case "lastAsked":
          comparison = b.lastAsked - a.lastAsked
          break
      }
      return sortOrder === "asc" ? -comparison : comparison
    })

    return result
  }, [questions, searchQuery, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))
  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredQuestions.slice(start, start + PAGE_SIZE)
  }, [filteredQuestions, page])

  useEffect(() => {
    setPage(1)
  }, [selectedSchoolId, selectedClassId, dateRange, searchQuery, sortField, sortOrder])

  const handleSort = (field: "question" | "frequency" | "users" | "lastAsked") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const filteredClasses = useMemo(() => {
    if (!isSuperAdmin || selectedSchoolId === "all") return classes
    return classes.filter(c => c.schoolId === selectedSchoolId)
  }, [classes, selectedSchoolId, isSuperAdmin])

  const toggleExpand = async (hash: string) => {
    const newExpanded = new Set(expandedHashes)
    
    if (newExpanded.has(hash)) {
      newExpanded.delete(hash)
      setExpandedHashes(newExpanded)
      return
    }

    newExpanded.add(hash)
    setExpandedHashes(newExpanded)

    if (!instancesCache.has(hash) && !loadingInstances.has(hash)) {
      const newLoading = new Set(loadingInstances)
      newLoading.add(hash)
      setLoadingInstances(newLoading)

      try {
        const params = new URLSearchParams()
        if (selectedSchoolId && selectedSchoolId !== "all") {
          params.set("schoolId", selectedSchoolId)
        }
        if (selectedClassId && selectedClassId !== "all") {
          params.set("classId", selectedClassId)
        }

        const startDate = getStartDate(dateRange)
        if (startDate) {
          params.set("startDate", startDate.toISOString())
        }

        const response = await fetch(`/api/chat-questions/${hash}?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setInstancesCache(prev => new Map(prev).set(hash, data.instances || []))
        }
      } catch (error) {
        console.error("Failed to load instances:", error)
      } finally {
        const newLoading = new Set(loadingInstances)
        newLoading.delete(hash)
        setLoadingInstances(newLoading)
      }
    }
  }

  const getInstances = (hash: string): QuestionInstance[] => {
    return instancesCache.get(hash) || []
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isSuperAdmin 
          ? t("userManagement.aiQuestions.descriptionSuperAdmin")
          : isAdmin
            ? t("userManagement.aiQuestions.descriptionAdmin")
            : t("userManagement.aiQuestions.descriptionTeacher")}
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select value={selectedSchoolId} onValueChange={(v) => {
            setSelectedSchoolId(v)
            setSelectedClassId("all")
          }}>
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
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("userManagement.aiQuestions.selectClass")} />
          </SelectTrigger>
          <SelectContent>
            {(isSuperAdmin || isAdmin) && (
              <SelectItem value="all">{t("userManagement.aiQuestions.allClasses")}</SelectItem>
            )}
            {filteredClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("userManagement.aiQuestions.search")}
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
      </div>

      <div className="text-sm text-muted-foreground">
        {t("userManagement.aiQuestions.showing", { count: filteredQuestions.length, total })}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          {searchQuery 
            ? t("userManagement.aiQuestions.noResults")
            : t("userManagement.aiQuestions.noQuestions")}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("question")}>
                    {t("userManagement.aiQuestions.question")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-24 text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("frequency")}>
                    {t("userManagement.aiQuestions.frequency")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-24 text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("users")}>
                    {t("userManagement.aiQuestions.users")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-32 text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort("lastAsked")}>
                    {t("userManagement.aiQuestions.lastAsked")}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.map((question) => (
                <QuestionRow
                  key={question.questionHash}
                  question={question}
                  isExpanded={expandedHashes.has(question.questionHash)}
                  isLoading={loadingInstances.has(question.questionHash)}
                  instances={getInstances(question.questionHash)}
                  onToggle={() => toggleExpand(question.questionHash)}
                  t={t}
                  locale={i18n.language}
                />
              ))}
            </TableBody>
          </Table>
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
    </div>
  )
}

interface QuestionRowProps {
  question: AggregatedQuestion
  isExpanded: boolean
  isLoading: boolean
  instances: QuestionInstance[]
  onToggle: () => void
  t: (key: string, options?: Record<string, unknown>) => string
  locale: string
}

function QuestionRow({ question, isExpanded, isLoading, instances, onToggle, t, locale }: QuestionRowProps) {
  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <span className="line-clamp-2">{question.questionText}</span>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="secondary">{question.frequency}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            <span>{question.uniqueUserCount}</span>
          </div>
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
          <div>{new Date(question.lastAsked).toLocaleDateString(locale, {
            year: "numeric", month: "short", day: "numeric",
          })}</div>
          <div className="text-muted-foreground">{new Date(question.lastAsked).toLocaleTimeString(locale, {
            hour: "2-digit", minute: "2-digit",
          })}</div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={5} className="p-0">
            <div className="p-4 border-t">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : instances.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  {t("userManagement.aiQuestions.noInstances")}
                </div>
              ) : (
                <div className="space-y-4">
                  {instances.map((instance) => (
                    <div key={instance.id} className="border rounded-lg p-4 bg-background">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="font-medium">
                            {instance.userName || t("userManagement.users.noName")}
                          </div>
                          <div className="text-muted-foreground">
                            {instance.userEmail}
                          </div>
                        </div>
                        <div className="text-xs whitespace-nowrap">
                          <div>{new Date(instance.createdAt).toLocaleDateString(locale, {
                            year: "numeric", month: "short", day: "numeric",
                          })}</div>
                          <div className="text-muted-foreground">{new Date(instance.createdAt).toLocaleTimeString(locale, {
                            hour: "2-digit", minute: "2-digit",
                          })}</div>
                        </div>
                      </div>
                      {instance.docTitle && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <FileText className="h-3 w-3" />
                          <span>{instance.docTitle}</span>
                        </div>
                      )}
                      {instance.responseText && (
                        <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">
                          <View>{instance.responseText}</View>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
