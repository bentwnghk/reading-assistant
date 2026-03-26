"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import dynamic from "next/dynamic"
import { Loader2, Search, ChevronDown, ChevronRight, MessageCircle, Users, FileText } from "lucide-react"
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
  const { t } = useTranslation()
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [questions, setQuestions] = useState<AggregatedQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set())
  const [instancesCache, setInstancesCache] = useState<Map<string, QuestionInstance[]>>(new Map())
  const [loadingInstances, setLoadingInstances] = useState<Set<string>>(new Set())

  const _isTeacher = !isSuperAdmin && !isAdmin

  const loadInitialData = useCallback(async () => {
    try {
      const [classesRes, schoolsRes] = await Promise.all([
        fetch("/api/classes"),
        isSuperAdmin ? fetch("/api/schools") : null,
      ])

      if (classesRes.ok) {
        const data: ClassInfo[] = await classesRes.json()
        setClasses(data)
      }

      if (schoolsRes && schoolsRes.ok) {
        setSchools(await schoolsRes.json())
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error(t("userManagement.loadFailed"))
    }
  }, [t, isSuperAdmin])

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

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      params.set("startDate", sevenDaysAgo.toISOString())

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
  }, [selectedSchoolId, selectedClassId, t])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    loadQuestions()
    setExpandedHashes(new Set())
    setInstancesCache(new Map())
  }, [loadQuestions])

  const filteredQuestions = useMemo(() => {
    if (!searchQuery) return questions
    const query = searchQuery.toLowerCase()
    return questions.filter(q => 
      q.questionText.toLowerCase().includes(query)
    )
  }, [questions, searchQuery])

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

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        params.set("startDate", sevenDaysAgo.toISOString())

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
                <TableHead>{t("userManagement.aiQuestions.question")}</TableHead>
                <TableHead className="w-24 text-center">{t("userManagement.aiQuestions.frequency")}</TableHead>
                <TableHead className="w-24 text-center">{t("userManagement.aiQuestions.users")}</TableHead>
                <TableHead className="w-32 text-center">{t("userManagement.aiQuestions.lastAsked")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => (
                <QuestionRow
                  key={question.questionHash}
                  question={question}
                  isExpanded={expandedHashes.has(question.questionHash)}
                  isLoading={loadingInstances.has(question.questionHash)}
                  instances={getInstances(question.questionHash)}
                  onToggle={() => toggleExpand(question.questionHash)}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
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
}

function QuestionRow({ question, isExpanded, isLoading, instances, onToggle, t }: QuestionRowProps) {
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
          {dayjs(question.lastAsked).format("MM/DD HH:mm")}
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
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {dayjs(instance.createdAt).format("MM/DD HH:mm")}
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
