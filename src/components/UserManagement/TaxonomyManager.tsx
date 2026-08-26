"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, Pencil, Trash2, Check, X, BookMarked, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { SubjectInfo, GradeInfo } from "@/lib/class-taxonomy"
import type { SchoolInfo } from "@/lib/users"

interface TaxonomyManagerProps {
  isSuperAdmin: boolean
}

/**
 * School-managed subject & form/grade lists. Admins manage their own school's
 * lists; super-admins pick a school first. Classes reference these optionally
 * (deleting a subject/grade only detaches classes — FK ON DELETE SET NULL).
 */
export default function TaxonomyManager({ isSuperAdmin }: TaxonomyManagerProps) {
  const { t } = useTranslation()
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [grades, setGrades] = useState<GradeInfo[]>([])
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [schoolId, setSchoolId] = useState<string>(isSuperAdmin ? "" : "")
  const [loading, setLoading] = useState(true)

  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectOrder, setNewSubjectOrder] = useState("0")
  const [newGradeName, setNewGradeName] = useState("")
  const [newGradeOrder, setNewGradeOrder] = useState("0")
  const [addingSubject, setAddingSubject] = useState(false)
  const [addingGrade, setAddingGrade] = useState(false)

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [editingSubjectName, setEditingSubjectName] = useState("")
  const [editingSubjectOrder, setEditingSubjectOrder] = useState("0")
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)
  const [editingGradeName, setEditingGradeName] = useState("")
  const [editingGradeOrder, setEditingGradeOrder] = useState("0")

  const loadTaxonomy = useCallback(async () => {
    setLoading(true)
    try {
      const fetches: Promise<Response>[] = [fetch("/api/subjects"), fetch("/api/grades")]
      if (isSuperAdmin) fetches.push(fetch("/api/schools"))
      const responses = await Promise.all(fetches)
      if (responses[0].ok) setSubjects(await responses[0].json())
      if (responses[1].ok) setGrades(await responses[1].json())
      if (isSuperAdmin && responses[2].ok) {
        const loadedSchools: SchoolInfo[] = await responses[2].json()
        setSchools(loadedSchools)
        if (!schoolId && loadedSchools.length > 0) {
          setSchoolId(loadedSchools[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load taxonomy:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t, isSuperAdmin, schoolId])

  useEffect(() => {
    loadTaxonomy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scopedSubjects = useMemo(
    () => (isSuperAdmin && schoolId ? subjects.filter(s => s.schoolId === schoolId) : subjects),
    [subjects, isSuperAdmin, schoolId]
  )
  const scopedGrades = useMemo(
    () => (isSuperAdmin && schoolId ? grades.filter(g => g.schoolId === schoolId) : grades),
    [grades, isSuperAdmin, schoolId]
  )

  // Pre-fill the next order numbers (max + 1) within the active school's lists
  // so admins rarely need to touch the Order boxes. Empty lists keep the "0"
  // default for the first entry.
  useEffect(() => {
    if (scopedSubjects.length === 0) return
    setNewSubjectOrder(String(Math.max(...scopedSubjects.map(s => s.sortOrder)) + 1))
  }, [scopedSubjects])

  useEffect(() => {
    if (scopedGrades.length === 0) return
    setNewGradeOrder(String(Math.max(...scopedGrades.map(g => g.sortOrder)) + 1))
  }, [scopedGrades])

  const canWrite = isSuperAdmin ? !!schoolId : true
  const writeSchoolId = isSuperAdmin ? schoolId : undefined

  const addSubject = async () => {
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubjectName.trim(),
          sortOrder: parseInt(newSubjectOrder) || 0,
          ...(writeSchoolId ? { schoolId: writeSchoolId } : {}),
        }),
      })
      if (res.ok) {
        setNewSubjectName("")
        await loadTaxonomy()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || t("taxonomy.addSubjectFailed"))
      }
    } finally {
      setAddingSubject(false)
    }
  }

  const renameSubject = async (id: string) => {
    if (!editingSubjectName.trim()) return
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSubjectName.trim(),
          sortOrder: parseInt(editingSubjectOrder) || 0,
          ...(writeSchoolId ? { schoolId: writeSchoolId } : {}),
        }),
      })
      if (res.ok) {
        setEditingSubjectId(null)
        await loadTaxonomy()
      } else {
        toast.error(t("taxonomy.updateFailed"))
      }
    } catch {
      toast.error(t("taxonomy.updateFailed"))
    }
  }

  const deleteSubject = async (id: string) => {
    if (!confirm(t("taxonomy.deleteSubjectConfirm"))) return
    try {
      const url = `/api/subjects/${id}${writeSchoolId ? `?schoolId=${writeSchoolId}` : ""}`
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) {
        await loadTaxonomy()
      } else {
        toast.error(t("taxonomy.deleteFailed"))
      }
    } catch {
      toast.error(t("taxonomy.deleteFailed"))
    }
  }

  const addGrade = async () => {
    if (!newGradeName.trim()) return
    setAddingGrade(true)
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGradeName.trim(),
          sortOrder: parseInt(newGradeOrder) || 0,
          ...(writeSchoolId ? { schoolId: writeSchoolId } : {}),
        }),
      })
      if (res.ok) {
        setNewGradeName("")
        setNewGradeOrder("0")
        await loadTaxonomy()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || t("taxonomy.addGradeFailed"))
      }
    } finally {
      setAddingGrade(false)
    }
  }

  const renameGrade = async (id: string) => {
    if (!editingGradeName.trim()) return
    try {
      const res = await fetch(`/api/grades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingGradeName.trim(),
          sortOrder: parseInt(editingGradeOrder) || 0,
          ...(writeSchoolId ? { schoolId: writeSchoolId } : {}),
        }),
      })
      if (res.ok) {
        setEditingGradeId(null)
        await loadTaxonomy()
      } else {
        toast.error(t("taxonomy.updateFailed"))
      }
    } catch {
      toast.error(t("taxonomy.updateFailed"))
    }
  }

  const deleteGrade = async (id: string) => {
    if (!confirm(t("taxonomy.deleteGradeConfirm"))) return
    try {
      const url = `/api/grades/${id}${writeSchoolId ? `?schoolId=${writeSchoolId}` : ""}`
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) {
        await loadTaxonomy()
      } else {
        toast.error(t("taxonomy.deleteFailed"))
      }
    } catch {
      toast.error(t("taxonomy.deleteFailed"))
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
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("taxonomy.description")}</p>

      {isSuperAdmin && (
        <div className="max-w-xs">
          <label className="text-sm font-medium">{t("userManagement.classes.school")}</label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger>
              <SelectValue placeholder={t("userManagement.classes.selectSchool")} />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!canWrite ? (
        <p className="text-sm text-muted-foreground">{t("taxonomy.selectSchoolFirst")}</p>
      ) : (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <BookMarked className="h-4 w-4" />
              {t("taxonomy.subjects")}
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label htmlFor="new-subject-name" className="text-sm font-medium">
                  {t("taxonomy.subjectName")}
                </label>
                <Input
                  id="new-subject-name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder={t("taxonomy.subjectNamePlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") addSubject() }}
                  className="max-w-xs"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="new-subject-order"
                  className="text-sm font-medium"
                  title={t("taxonomy.sortOrderHint")}
                >
                  {t("taxonomy.sortOrder")}
                </label>
                <Input
                  id="new-subject-order"
                  type="number"
                  value={newSubjectOrder}
                  onChange={(e) => setNewSubjectOrder(e.target.value)}
                  placeholder={t("taxonomy.sortOrder")}
                  className="w-24"
                />
              </div>
              <Button onClick={addSubject} disabled={addingSubject || !newSubjectName.trim()} size="sm">
                {addingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {t("taxonomy.addSubject")}
              </Button>
            </div>
            {scopedSubjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("taxonomy.subjectName")}</TableHead>
                    <TableHead className="w-24">{t("taxonomy.sortOrder")}</TableHead>
                    <TableHead className="w-24">{t("userManagement.classes.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        {editingSubjectId === subject.id ? (
                          <div className="flex items-center gap-1 max-w-xs">
                            <Input
                              value={editingSubjectName}
                              onChange={(e) => setEditingSubjectName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") renameSubject(subject.id) }}
                              className="h-8"
                            />
                            <Input
                              type="number"
                              value={editingSubjectOrder}
                              onChange={(e) => setEditingSubjectOrder(e.target.value)}
                              className="h-8 w-20"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameSubject(subject.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSubjectId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          subject.name
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {editingSubjectId === subject.id ? null : subject.sortOrder}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingSubjectId(subject.id)
                              setEditingSubjectName(subject.name)
                              setEditingSubjectOrder(String(subject.sortOrder))
                            }}
                            title={t("userManagement.classes.edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => deleteSubject(subject.id)}
                            title={t("userManagement.classes.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("taxonomy.noSubjects")}</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              {t("taxonomy.grades")}
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label htmlFor="new-grade-name" className="text-sm font-medium">
                  {t("taxonomy.gradeName")}
                </label>
                <Input
                  id="new-grade-name"
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                  placeholder={t("taxonomy.gradeNamePlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") addGrade() }}
                  className="max-w-xs"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="new-grade-order"
                  className="text-sm font-medium"
                  title={t("taxonomy.sortOrderHint")}
                >
                  {t("taxonomy.sortOrder")}
                </label>
                <Input
                  id="new-grade-order"
                  type="number"
                  value={newGradeOrder}
                  onChange={(e) => setNewGradeOrder(e.target.value)}
                  placeholder={t("taxonomy.sortOrder")}
                  className="w-24"
                />
              </div>
              <Button onClick={addGrade} disabled={addingGrade || !newGradeName.trim()} size="sm">
                {addingGrade ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {t("taxonomy.addGrade")}
              </Button>
            </div>
            {scopedGrades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("taxonomy.gradeName")}</TableHead>
                    <TableHead className="w-24">{t("taxonomy.sortOrder")}</TableHead>
                    <TableHead className="w-24">{t("userManagement.classes.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        {editingGradeId === grade.id ? (
                          <div className="flex items-center gap-1 max-w-xs">
                            <Input
                              value={editingGradeName}
                              onChange={(e) => setEditingGradeName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") renameGrade(grade.id) }}
                              className="h-8"
                            />
                            <Input
                              type="number"
                              value={editingGradeOrder}
                              onChange={(e) => setEditingGradeOrder(e.target.value)}
                              className="h-8 w-20"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameGrade(grade.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGradeId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          grade.name
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {editingGradeId === grade.id ? null : grade.sortOrder}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingGradeId(grade.id)
                              setEditingGradeName(grade.name)
                              setEditingGradeOrder(String(grade.sortOrder))
                            }}
                            title={t("userManagement.classes.edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => deleteGrade(grade.id)}
                            title={t("userManagement.classes.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("taxonomy.noGrades")}</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
