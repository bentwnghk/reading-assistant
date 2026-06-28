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
  ClipboardCheck,
  HelpCircle,
  Sparkles,
  TrendingUp,
  ListChecks,
  BadgeCheck,
  FileText,
  BarChart3,
  AlertCircle,
  Bookmark,
  Download,
  Info,
  GraduationCap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/utils/style"
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
  const [showHelp, setShowHelp] = useState(false)
  const [helpTab, setHelpTab] = useState<"overview" | "tracking" | "manage">(
    "overview",
  )

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          {t("assignments.title")}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowHelp(true)}
            title={t("assignments.help.title")}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </h1>
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
        <div className="grid gap-3 min-w-0">
          {assignments.map((a) => {
            const overdue =
              a.status === "active" &&
              isOverdue(a.dueDate) &&
              (a.avgProgress ?? 0) < 100

            return (
              <Card
                key={a.id}
                className={`overflow-hidden transition-colors hover:bg-accent/40 ${
                  a.status === "archived" ? "opacity-60" : ""
                }`}
              >
                <div className="p-6 pb-3">
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
                </div>
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
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
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

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("assignments.help.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {([
              "overview",
              "tracking",
              ...(isTeacher ? (["manage"] as const) : []),
            ] as ("overview" | "tracking" | "manage")[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setHelpTab(tab)}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                  helpTab === tab
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`assignments.help.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {helpTab === "overview" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("assignments.help.overview.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.overview.list.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.overview.list.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.overview.status.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.overview.status.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.overview.due.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.overview.due.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.overview.detail.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.overview.detail.desc")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {helpTab === "tracking" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("assignments.help.tracking.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.tracking.avgProgress.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.tracking.avgProgress.desc")}
                  </p>
                </div>
              </div>

              {isTeacher && (
                <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {t("assignments.help.tracking.studentCount.name")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("assignments.help.tracking.studentCount.desc")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.tracking.overdue.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.tracking.overdue.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.tracking.roster.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.tracking.roster.desc")}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs">
                  <span className="font-semibold">
                    {t("assignments.help.tracking.srs.title")}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {t("assignments.help.tracking.srs.desc")}
                  </span>
                </p>
              </div>
            </div>
          )}

          {helpTab === "manage" && isTeacher && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("assignments.help.manage.intro")}
              </p>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t("assignments.help.manage.gettingStarted.title")}
                </h4>
                <ol className="space-y-2.5">
                  {(["step1", "step2", "step3", "step4", "step5"] as const).map(
                    (step, i) => (
                      <li key={step} className="flex gap-2.5">
                        <div className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                          {t(`assignments.help.manage.gettingStarted.${step}`)}
                        </p>
                      </li>
                    ),
                  )}
                </ol>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.manage.create.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.manage.create.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.manage.presets.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.manage.presets.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.manage.edit.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.manage.edit.desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Download className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {t("assignments.help.manage.export.name")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("assignments.help.manage.export.desc")}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex gap-2">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("assignments.help.manage.tip.title")}
                  </span>{" "}
                  {t("assignments.help.manage.tip.content")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
