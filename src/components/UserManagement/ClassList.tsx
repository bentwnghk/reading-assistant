"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, Pencil, Trash2, Users, ArrowUpDown, School, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { ClassInfo, UserWithRole, SchoolInfo } from "@/lib/users"
import type { SubjectInfo, GradeInfo } from "@/lib/class-taxonomy"
import { formatClassLabel } from "@/components/Internal/ClassCombobox"
import ClassMembers from "./ClassMembers"

interface ClassListProps {
  isSuperAdmin: boolean
  isAdmin: boolean
  currentUserId?: string
  onViewStudents?: (classId: string, schoolId?: string) => void
}

type SortField = "name" | "teacherName" | "schoolName" | "studentCount"
type SortOrder = "asc" | "desc"

export default function ClassList({ isSuperAdmin, isAdmin, currentUserId: _currentUserId, onViewStudents }: ClassListProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "teacher"

  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [teachers, setTeachers] = useState<UserWithRole[]>([])
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [grades, setGrades] = useState<GradeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", teacherId: "", schoolId: "", subjectId: "__none__", gradeId: "__none__" })
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const fetches: Promise<Response>[] = [fetch("/api/classes"), fetch("/api/subjects"), fetch("/api/grades")]
      if (isSuperAdmin) {
        fetches.push(fetch("/api/schools"))
      }
      if (!isTeacher) {
        fetches.push(fetch("/api/users"))
      }

      const responses = await Promise.all(fetches)
      const classesRes = responses[0]
      if (classesRes.ok) {
        setClasses(await classesRes.json())
      }
      const subjectsRes = responses[1]
      if (subjectsRes.ok) {
        setSubjects(await subjectsRes.json())
      }
      const gradesRes = responses[2]
      if (gradesRes.ok) {
        setGrades(await gradesRes.json())
      }

      let respIndex = 3
      if (isSuperAdmin) {
        const schoolsRes = responses[respIndex]
        if (schoolsRes?.ok) {
          setSchools(await schoolsRes.json())
        }
        respIndex += 1
      }

      if (!isTeacher) {
        const usersRes = responses[respIndex]
        if (usersRes?.ok) {
          const users: UserWithRole[] = await usersRes.json()
          setTeachers(users.filter(u => u.role === "teacher" || u.role === "admin" || u.role === "super-admin"))
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t, isTeacher, isSuperAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subjects/grades are school-scoped; super-admins filter by the selected school.
  const dialogSchoolId = isSuperAdmin
    ? (formData.schoolId === "__none__" ? null : formData.schoolId || null)
    : (schools[0]?.id ?? null)
  const filteredSubjects = useMemo(
    () => dialogSchoolId ? subjects.filter(s => s.schoolId === dialogSchoolId) : subjects,
    [subjects, dialogSchoolId]
  )
  const filteredGrades = useMemo(
    () => dialogSchoolId ? grades.filter(g => g.schoolId === dialogSchoolId) : grades,
    [grades, dialogSchoolId]
  )

  const filteredTeachers = useMemo(() => {
    if (!isSuperAdmin) return teachers
    if (!formData.schoolId || formData.schoolId === "__none__") return teachers
    return teachers.filter(t => t.schoolId === formData.schoolId)
  }, [teachers, isSuperAdmin, formData.schoolId])

  // Live preview of the label shown in the Classes table's Class Name column
  // (Grade · Subject · Name). Looked up from the full lists so the preview
  // matches what gets saved even when a super-admin changes the school filter.
  const trimmedClassName = formData.name.trim()
  const previewLabel = trimmedClassName
    ? formatClassLabel({
        name: trimmedClassName,
        subjectName: subjects.find(s => s.id === formData.subjectId)?.name,
        gradeName: grades.find(g => g.id === formData.gradeId)?.name,
      })
    : ""

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = formatClassLabel(a).localeCompare(formatClassLabel(b))
          break
        case "teacherName":
          comparison = (a.teacherName || "").localeCompare(b.teacherName || "")
          break
        case "schoolName":
          comparison = (a.schoolName || "").localeCompare(b.schoolName || "")
          break
        case "studentCount":
          comparison = (b.studentCount || 0) - (a.studentCount || 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [classes, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedClasses.length / PAGE_SIZE))
  const paginatedClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedClasses.slice(start, start + PAGE_SIZE)
  }, [sortedClasses, page])

  useEffect(() => {
    setPage(1)
  }, [sortField, sortOrder])

  const canEditClass = (classInfo: ClassInfo) => {
    if (isSuperAdmin) return true
    if (isAdmin) return true
    if (isTeacher && session?.user?.id) {
      return classInfo.teacherId === session.user.id
    }
    return false
  }

  const canDeleteClass = () => {
    return isSuperAdmin || isAdmin
  }

  const canManageMembers = (classInfo: ClassInfo) => {
    if (isSuperAdmin) return true
    if (isAdmin) return true
    if (isTeacher && session?.user?.id) {
      return classInfo.teacherId === session.user.id
    }
    return false
  }

  const openCreateDialog = () => {
    setSelectedClass(null)
    setFormData({ name: "", description: "", teacherId: "__none__", schoolId: "__none__", subjectId: "__none__", gradeId: "__none__" })
    setEditDialogOpen(true)
  }

  const openEditDialog = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setFormData({
      name: classInfo.name,
      description: classInfo.description || "",
      teacherId: classInfo.teacherId || "__none__",
      schoolId: classInfo.schoolId || "__none__",
      subjectId: classInfo.subjectId || "__none__",
      gradeId: classInfo.gradeId || "__none__",
    })
    setEditDialogOpen(true)
  }

  const openMembersDialog = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setMembersDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t("userManagement.classes.nameRequired"))
      return
    }

    try {
      const url = selectedClass ? `/api/classes/${selectedClass.id}` : "/api/classes"
      const method = selectedClass ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          teacherId: formData.teacherId === "__none__" ? null : formData.teacherId,
          ...(isSuperAdmin ? { schoolId: formData.schoolId === "__none__" ? null : formData.schoolId } : {}),
          subjectId: formData.subjectId === "__none__" ? null : formData.subjectId,
          gradeId: formData.gradeId === "__none__" ? null : formData.gradeId,
        }),
      })

      if (response.ok) {
        toast.success(selectedClass ? t("userManagement.classes.updated") : t("userManagement.classes.created"))
        setEditDialogOpen(false)
        loadData()
      } else {
        toast.error(t("userManagement.classes.saveFailed"))
      }
    } catch (error) {
      console.error("Failed to save class:", error)
      toast.error(t("userManagement.classes.saveFailed"))
    }
  }

  const handleDelete = async (classId: string) => {
    if (!confirm(t("userManagement.classes.deleteConfirm"))) return

    try {
      const response = await fetch(`/api/classes/${classId}`, { method: "DELETE" })
      if (response.ok) {
        toast.success(t("userManagement.classes.deleted"))
        loadData()
      } else {
        toast.error(t("userManagement.classes.deleteFailed"))
      }
    } catch (error) {
      console.error("Failed to delete class:", error)
      toast.error(t("userManagement.classes.deleteFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          {isSuperAdmin 
            ? t("userManagement.classes.descriptionSuperAdmin")
            : isAdmin
              ? t("userManagement.classes.descriptionAdmin")
              : t("userManagement.classes.descriptionTeacher")}
        </p>
        {(isSuperAdmin || isAdmin || isTeacher) && (
          <Button onClick={openCreateDialog} variant="outline" size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            {t("userManagement.classes.create")}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("name")}>
                {t("userManagement.classes.name")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            {isSuperAdmin && (
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("schoolName")}>
                  {t("userManagement.classes.school")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            )}
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort("teacherName")}>
                {t("userManagement.classes.teacher")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">
              <Button variant="ghost" size="sm" onClick={() => handleSort("studentCount")}>
                {t("userManagement.classes.students")}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>{t("userManagement.classes.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedClasses.map((classInfo) => (
            <TableRow key={classInfo.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {formatClassLabel(classInfo)}
                  </div>
                  {classInfo.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-48">
                      {classInfo.description}
                    </div>
                  )}
                </div>
              </TableCell>
              {isSuperAdmin && (
                <TableCell>
                  {classInfo.schoolName ? (
                    <div className="flex items-center gap-1">
                      <School className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate max-w-32" title={classInfo.schoolName}>{classInfo.schoolName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                {classInfo.teacherName ? (
                  <Badge variant="outline">{classInfo.teacherName}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {onViewStudents && (classInfo.studentCount || 0) > 0 ? (
                  <button
                    type="button"
                    className="inline-flex cursor-pointer rounded-full transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => onViewStudents(classInfo.id, classInfo.schoolId ?? undefined)}
                    title={t("userManagement.classes.viewStudents", { name: classInfo.name })}
                  >
                    <Badge variant="secondary" className="cursor-pointer">{classInfo.studentCount || 0}</Badge>
                  </button>
                ) : (
                  <Badge variant="secondary">{classInfo.studentCount || 0}</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {canManageMembers(classInfo) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openMembersDialog(classInfo)}
                      title={t("userManagement.classes.manageMembers")}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  )}
                  {canEditClass(classInfo) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(classInfo)}
                      title={t("userManagement.classes.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteClass() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleDelete(classInfo.id)}
                      title={t("userManagement.classes.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {classes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("userManagement.classes.noClasses")}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? t("userManagement.classes.edit") : t("userManagement.classes.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isSuperAdmin && (
              <div>
                <label className="text-sm font-medium">{t("userManagement.classes.school")}</label>
                <Select
                  value={formData.schoolId}
                  onValueChange={(value) => {
                    const nextTeacher = filteredTeachers.some(t => t.id === formData.teacherId)
                      ? formData.teacherId
                      : "__none__"
                    setFormData({ ...formData, schoolId: value, teacherId: nextTeacher })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("userManagement.classes.selectSchool")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("userManagement.classes.noSchool")}</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{t("userManagement.classes.name")}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("userManagement.classes.namePlaceholder")}
              />
              {previewLabel && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("userManagement.classes.displaysAs")}:{" "}
                  <span className="font-medium text-foreground">{previewLabel}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("userManagement.classes.subject")}</label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("userManagement.classes.subject")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("userManagement.classes.noSubject")}</SelectItem>
                    {filteredSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("userManagement.classes.grade")}</label>
                <Select
                  value={formData.gradeId}
                  onValueChange={(value) => setFormData({ ...formData, gradeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("userManagement.classes.grade")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("userManagement.classes.noGrade")}</SelectItem>
                    {filteredGrades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("userManagement.classes.descriptionLabel")}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("userManagement.classes.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            {!isTeacher && (
              <div>
                <label className="text-sm font-medium">{t("userManagement.classes.teacher")}</label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("userManagement.classes.selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("userManagement.classes.noTeacher")}</SelectItem>
                    {filteredTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name || teacher.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("userManagement.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("userManagement.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("userManagement.classes.membersTitle", { name: selectedClass ? formatClassLabel(selectedClass) : "" })}
              {isSuperAdmin && selectedClass?.schoolName && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {selectedClass.schoolName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <ClassMembers
              classId={selectedClass.id}
              isAdmin={isSuperAdmin || isAdmin}
              onMembersChange={loadData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
