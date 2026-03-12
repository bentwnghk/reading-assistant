"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react"
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
import type { ClassInfo, UserWithRole } from "@/lib/users"
import ClassMembers from "./ClassMembers"

interface ClassListProps {
  isAdmin: boolean
  currentUserId?: string
}

export default function ClassList({ isAdmin, currentUserId: _currentUserId }: ClassListProps) {
  const { t } = useTranslation()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [teachers, setTeachers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", teacherId: "" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classesRes, usersRes] = await Promise.all([
        fetch("/api/classes"),
        isAdmin ? fetch("/api/users") : Promise.resolve(null),
      ])

      if (classesRes.ok) {
        setClasses(await classesRes.json())
      }
      if (usersRes?.ok) {
        const users = await usersRes.json()
        setTeachers(users.filter((u: UserWithRole) => u.role === "teacher" || u.role === "admin"))
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error(t("userManagement.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreateDialog = () => {
    setSelectedClass(null)
    setFormData({ name: "", description: "", teacherId: "__none__" })
    setEditDialogOpen(true)
  }

  const openEditDialog = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setFormData({
      name: classInfo.name,
      description: classInfo.description || "",
      teacherId: classInfo.teacherId || "__none__",
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t("userManagement.classes.description")}</p>
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("userManagement.classes.create")}
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("userManagement.classes.name")}</TableHead>
            <TableHead>{t("userManagement.classes.teacher")}</TableHead>
            <TableHead className="text-center">{t("userManagement.classes.students")}</TableHead>
            <TableHead>{t("userManagement.classes.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((classInfo) => (
            <TableRow key={classInfo.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{classInfo.name}</div>
                  {classInfo.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-48">
                      {classInfo.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {classInfo.teacherName ? (
                  <Badge variant="outline">{classInfo.teacherName}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{classInfo.studentCount || 0}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openMembersDialog(classInfo)}
                    title={t("userManagement.classes.manageMembers")}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(classInfo)}
                        title={t("userManagement.classes.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(classInfo.id)}
                        title={t("userManagement.classes.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? t("userManagement.classes.edit") : t("userManagement.classes.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t("userManagement.classes.name")}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("userManagement.classes.namePlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("userManagement.classes.description")}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("userManagement.classes.descriptionPlaceholder")}
                rows={3}
              />
            </div>
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
                   {teachers.map((teacher) => (
                     <SelectItem key={teacher.id} value={teacher.id}>
                       {teacher.name || teacher.email}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
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
              {t("userManagement.classes.membersTitle", { name: selectedClass?.name })}
            </DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <ClassMembers
              classId={selectedClass.id}
              isAdmin={isAdmin}
              onMembersChange={loadData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
