"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Bookmark,
  ChevronDown,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { RecipientPicker } from "@/components/Internal/RecipientPicker"
import type { ShareTargetGroup } from "@/lib/shared-sessions"

export default function PresetsSection() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const currentRole = session?.user?.role
  const canManageAny = currentRole === "admin" || currentRole === "super-admin"

  const [presets, setPresets] = useState<AssignmentPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<AssignmentPreset | null>(null)
  const [deleting, setDeleting] = useState<AssignmentPreset | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assignments/presets")
      if (!res.ok) throw new Error("Failed")
      const data: AssignmentPreset[] = await res.json()
      setPresets(data)
    } catch {
      toast.error(t("assignments.error.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(preset: AssignmentPreset) {
    setDeleting(null)
    const original = presets
    setPresets((prev) => prev.filter((p) => p.id !== preset.id))
    try {
      const res = await fetch(`/api/assignments/presets/${preset.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(t("assignments.presets.deleted"))
    } catch {
      setPresets(original)
      toast.error(t("assignments.error.loadFailed"))
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground min-w-0"
          onClick={() => setOpen((o) => !o)}
        >
          <Bookmark className="h-4 w-4 mr-1.5" />
          {t("assignments.presets.sectionTitle")}
          <Badge variant="secondary" className="ml-2">
            {presets.length}
          </Badge>
          <ChevronDown
            className={`h-4 w-4 ml-1 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCreating({
              id: "",
              teacherId: "",
              schoolId: "",
              name: "",
              description: "",
              studentIds: [],
              studentCount: 0,
              createdAt: "",
              updatedAt: "",
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("assignments.presets.create")}
        </Button>
      </div>

      {open &&
        (loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : presets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 px-1">
            {t("assignments.presets.empty")}
          </p>
        ) : (
          <div className="grid gap-2 py-2">
            {presets.map((p) => {
              const canManage =
                canManageAny || p.teacherId === currentUserId
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{p.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Users className="h-3 w-3" />
                        {t("assignments.presets.studentCount", {
                          count: p.studentCount,
                        })}
                      </span>
                      {p.createdByName && (
                        <Badge variant="outline" className="text-xs font-normal shrink-0">
                          {t("assignments.presets.createdBy", {
                            name: p.createdByName,
                          })}
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreating(p)}
                      title={t("assignments.presets.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(p)}
                      title={t("assignments.presets.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ))}

      <PresetEditDialog
        preset={creating}
        onClose={() => setCreating(null)}
        onSaved={(preset) => {
          setPresets((prev) => {
            const exists = prev.some((p) => p.id === preset.id)
            const next = exists
              ? prev.map((p) => (p.id === preset.id ? preset : p))
              : [...prev, preset]
            return next.sort((a, b) => a.name.localeCompare(b.name))
          })
        }}
      />

      <DeleteDialog
        preset={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  )
}

/**
 * Create / edit dialog. When editing, allows picking students from the
 * assignment targets. When creating without a selection, the teacher can
 * still name it and add students later via edit.
 */
function PresetEditDialog({
  preset,
  onClose,
  onSaved,
}: {
  preset: AssignmentPreset | null
  onClose: () => void
  onSaved: (preset: AssignmentPreset) => void
}) {
  const { t } = useTranslation()
  const isEdit = !!preset?.id

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  // Student picker state (class-grouped recipients; the selectedIds Set
  // dedupes students who belong to multiple classes)
  const [groups, setGroups] = useState<ShareTargetGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!preset) return
    setName(preset.name)
    setDescription(preset.description ?? "")
    setSelectedIds(new Set(preset.studentIds))
    // Fetch all assignable targets (grouped by class) for the picker
    fetch("/api/assignments/targets")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShareTargetGroup[]) => setGroups(data))
      .catch(() => setGroups([]))
  }, [preset])

  async function handleSave() {
    if (!preset) return
    if (!name.trim()) {
      toast.error(t("assignments.presets.nameRequired"))
      return
    }
    if (selectedIds.size === 0) {
      toast.error(t("assignments.presets.noneSelected"))
      return
    }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        studentIds: [...selectedIds],
      }
      const res = isEdit
        ? await fetch(`/api/assignments/presets/${preset.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/assignments/presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed")
      }
      const saved: AssignmentPreset = await res.json()
      toast.success(isEdit ? t("assignments.presets.updated") : t("assignments.presets.saved"))
      onSaved(saved)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("assignments.presets.error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!preset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("assignments.presets.edit")
              : t("assignments.presets.create")}
          </DialogTitle>
          <DialogDescription>
            {t("assignments.presets.saveAsCurrent")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">{t("assignments.presets.nameLabel")}</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("assignments.presets.namePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preset-desc">{t("assignments.presets.descLabel")}</Label>
            <Input
              id="preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {t("assignments.create.selectStudents")}
              </Label>
              <Badge variant="secondary">{selectedIds.size}</Badge>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t("assignments.create.noStudents")}
              </p>
            ) : (
              <RecipientPicker
                groups={groups}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                searchPlaceholder={t("assignments.create.searchStudents")}
                selectAllLabel={t("assignments.create.selectAll")}
                deselectAllLabel={t("assignments.create.deselectAll")}
                listClassName="max-h-[35vh] border rounded p-2"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("assignments.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || selectedIds.size === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {t("assignments.presets.creating")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {isEdit
                  ? t("assignments.presets.edit")
                  : t("assignments.presets.create")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  preset,
  onClose,
  onConfirm,
}: {
  preset: AssignmentPreset | null
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!preset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assignments.presets.delete")}</DialogTitle>
          <DialogDescription>
            {t("assignments.presets.deleteConfirm")}
          </DialogDescription>
        </DialogHeader>
        {preset && (
          <p className="text-sm font-medium py-1">
            {preset.name}{" "}
            <span className="text-muted-foreground">
              ({t("assignments.presets.studentCount", { count: preset.studentCount })})
            </span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("assignments.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("assignments.presets.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
