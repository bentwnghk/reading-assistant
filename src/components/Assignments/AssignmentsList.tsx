"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { toast } from "sonner"
import {
  Calendar,
  Users,
  Loader2,
  Plus,
  Archive,
  Trash2,
  Pencil,
  ArchiveRestore,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useGlobalStore } from "@/store/global"
import PresetsSection from "./PresetsSection"

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

export default function AssignmentsList() {
  const { data: session } = useSession()
  const { t, i18n } = useTranslation()
  const setOpenDashboard = useGlobalStore((s) => s.setOpenDashboard)

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)

  const role = session?.user?.role
  const isTeacher = role === "teacher" || role === "admin" || role === "super-admin"

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assignments")
      if (!res.ok) throw new Error("Failed")
      const data: Assignment[] = await res.json()
      setAssignments(data)
    } catch {
      toast.error(t("assignments.error.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleArchive(assignment: Assignment, archive: boolean) {
    const original = assignments
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id ? { ...a, status: archive ? "archived" : "active" } : a,
      ),
    )
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: archive ? "archived" : "active" }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(
        archive ? t("assignments.teacherView.archived") : t("assignments.teacherView.unarchived"),
      )
    } catch {
      setAssignments(original)
      toast.error(t("assignments.error.loadFailed"))
    }
  }

  async function handleDelete(assignment: Assignment) {
    const original = assignments
    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id))
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success(t("assignments.teacherView.deleted"))
    } catch {
      setAssignments(original)
      toast.error(t("assignments.error.loadFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("assignments.title")}</h1>
        {isTeacher && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenDashboard(true, "sessions")}
            title={t("assignments.teacherView.new")}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("assignments.teacherView.new")}
          </Button>
        )}
      </div>

      {isTeacher && <PresetsSection />}

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isTeacher
              ? t("assignments.teacherView.empty")
              : t("assignments.studentView.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => {
            const overdue =
              a.status === "active" &&
              isOverdue(a.dueDate) &&
              (a.avgProgress ?? 0) < 100

            return (
              <Card
                key={a.id}
                className={`transition-colors hover:bg-accent/40 ${
                  a.status === "archived" ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <Link
                        href={`/assignments/${a.id}`}
                        className="block hover:underline"
                      >
                        <CardTitle className="truncate text-lg">
                          {a.title}
                        </CardTitle>
                      </Link>
                      {a.subject && (
                        <CardDescription className="mt-0.5">
                          {a.subject}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Badge variant={a.status === "active" ? "default" : "secondary"}>
                        {t(`assignments.status.${a.status}`)}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive">
                          {t("assignments.teacherView.overdue")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {a.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {isTeacher && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {t("assignments.teacherView.studentCount", {
                          count: a.studentCount ?? 0,
                        })}
                      </span>
                    )}
                    {!isTeacher && a.teacherName && (
                      <span>
                        {t("assignments.studentView.from", { teacher: a.teacherName })}
                      </span>
                    )}
                    {a.dueDate ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          overdue ? "text-destructive" : ""
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {overdue
                          ? t("assignments.studentView.overdue")
                          : t("assignments.studentView.due", {
                              date: formatDate(a.dueDate, i18n.language),
                            })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {t("assignments.studentView.noDueDate")}
                      </span>
                    )}
                    {(a.avgProgress ?? 0) > 0 && (
                      <span>
                        {isTeacher
                          ? t("assignments.teacherView.avgProgress", {
                              progress: a.avgProgress ?? 0,
                            })
                          : t("assignments.studentView.progress", {
                              progress: a.avgProgress ?? 0,
                            })}
                      </span>
                    )}
                  </div>

                  {isTeacher && (
                    <div className="flex flex-wrap items-center gap-1 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(a)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {t("assignments.teacherView.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(a, a.status === "active")}
                      >
                        {a.status === "active" ? (
                          <>
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            {t("assignments.teacherView.archive")}
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                            {t("assignments.teacherView.unarchive")}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("assignments.teacherView.delete")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <EditDialog
        assignment={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
      <DeleteDialog
        assignment={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}

function EditDialog({
  assignment,
  onClose,
  onSaved,
}: {
  assignment: Assignment | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!assignment) return
    setTitle(assignment.title)
    setDescription(assignment.description ?? "")
    setSubject(assignment.subject ?? "")
    if (assignment.dueDate) {
      const d = new Date(assignment.dueDate)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setDueDate(local)
    } else {
      setDueDate("")
    }
  }, [assignment])

  async function handleSave() {
    if (!assignment) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
      }
      if (dueDate) {
        body.dueDate = new Date(dueDate).toISOString()
      } else {
        body.dueDate = null
      }
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(t("assignments.teacherView.edited"))
      onClose()
      onSaved()
    } catch {
      toast.error(t("assignments.error.loadFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assignments.teacherView.edit")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{t("assignments.create.titleLabel")}</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject">{t("assignments.create.subjectLabel")}</Label>
              <Input
                id="edit-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-due">{t("assignments.create.dueDateLabel")}</Label>
              <Input
                id="edit-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">{t("assignments.create.descriptionLabel")}</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("assignments.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? t("assignments.create.creating") : t("assignments.teacherView.edit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  assignment,
  onClose,
  onConfirm,
}: {
  assignment: Assignment | null
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assignments.teacherView.delete")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm py-2">
          {t("assignments.teacherView.deleteConfirm")}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("assignments.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("assignments.teacherView.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
