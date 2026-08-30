"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, BookmarkPlus, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RecipientPicker } from "@/components/Internal/RecipientPicker"
import type { ReadingHistory } from "@/store/history"
import type { ShareTargetGroup } from "@/lib/shared-sessions"

interface AssignRosterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ReadingHistory | null
}

const COMMON_SUBJECTS: Array<{ en: string; zh: string }> = [
  { en: "English", zh: "英文" },
  { en: "Math", zh: "數學" },
  { en: "CES", zh: "公經社" },
  { en: "Geography", zh: "地理" },
  { en: "History", zh: "歷史" },
  { en: "Science", zh: "科學" },
  { en: "Biology", zh: "生物" },
  { en: "Chemistry", zh: "化學" },
  { en: "Physics", zh: "物理" },
  { en: "ICT", zh: "電腦" },
  { en: "Music", zh: "音樂" },
  { en: "RS", zh: "宗教" },
  { en: "Others", zh: "其他" },
]

export default function AssignRosterDialog({
  open,
  onOpenChange,
  session,
}: AssignRosterDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: authSession } = useSession()
  // Only admins/super-admins can create presets; teachers may only apply them
  const canSavePreset =
    authSession?.user?.role === "admin" ||
    authSession?.user?.role === "super-admin"

  const [groups, setGroups] = useState<ShareTargetGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Preset (saved roster) state
  const [presets, setPresets] = useState<AssignmentPreset[]>([])
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [savingPreset, setSavingPreset] = useState(false)
  // The preset currently applied to the selection. Sent with the create
  // request so the server can authorize its members (who may be outside
  // the teacher's own classes). Own-class students can still be toggled
  // on top; replacing the selection with another preset swaps this id.
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setGroups([])
      setSelectedIds(new Set())
      setTitle("")
      setDescription("")
      setSubject("")
      setDueDate("")
      setShowSavePreset(false)
      setPresetName("")
      setAppliedPresetId(null)
      return
    }
    // Pre-fill title from the source session
    if (session) {
      setTitle(session.docTitle || session.extractedText?.slice(0, 80) || "")
    }
    setLoading(true)
    fetch("/api/assignments/targets")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShareTargetGroup[]) => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
    fetch("/api/assignments/presets")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AssignmentPreset[]) => setPresets(data))
      .catch(() => setPresets([]))
  }, [open, session])

  // Presets are admin-curated rosters: their members are assignable even
  // when they are not in the teacher's own classes, so apply the full list
  // unfiltered. The applied preset id is remembered so the server can
  // authorize exactly these members on submit. Members who are no longer
  // active students are dropped server-side.
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId)
      if (!preset) return
      setSelectedIds(new Set(preset.studentIds))
      setAppliedPresetId(presetId)
      toast.success(t("assignments.presets.loaded"))
    },
    [presets, t],
  )

  async function handleSavePreset() {
    if (!presetName.trim()) {
      toast.error(t("assignments.presets.nameRequired"))
      return
    }
    if (selectedIds.size === 0) {
      toast.error(t("assignments.presets.noneSelected"))
      return
    }
    setSavingPreset(true)
    try {
      const res = await fetch("/api/assignments/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim().slice(0, 100),
          studentIds: [...selectedIds],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed")
      }
      const preset: AssignmentPreset = await res.json()
      setPresets((prev) => [...prev, preset].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success(t("assignments.presets.saved"))
      setShowSavePreset(false)
      setPresetName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("assignments.presets.error"))
    } finally {
      setSavingPreset(false)
    }
  }

  async function handleSubmit() {
    if (!session) return
    if (!title.trim()) {
      toast.error(t("assignments.error.titleRequired"))
      return
    }
    if (selectedIds.size === 0) {
      toast.error(t("assignments.error.noStudents"))
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        sourceSessionId: session.id,
        studentIds: [...selectedIds],
      }
      if (appliedPresetId) {
        body.presetId = appliedPresetId
      }
      if (dueDate) {
        body.dueDate = new Date(dueDate).toISOString()
      }
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed")
      }
      const assignment = await res.json()
      toast.success(t("assignments.create.success"))
      onOpenChange(false)
      router.push(`/assignments/${assignment.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("assignments.create.error"))
    } finally {
      setSubmitting(false)
    }
  }

  const sessionTitle =
    session?.docTitle || session?.extractedText?.slice(0, 80) || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("assignments.create.title")}</DialogTitle>
          <DialogDescription className="truncate">
            {sessionTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Plain scroller over a plain list scroller (pre-v4.43 arrangement):
            a Radix ScrollArea nested in a plain scroller breaks mobile touch
            scrolling, plain+plain works — see RecipientPicker nestedScroll. */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Metadata fields */}
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assign-title">{t("assignments.create.titleLabel")}</Label>
              <Input
                id="assign-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("assignments.create.titlePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-subject">{t("assignments.create.subjectLabel")}</Label>
                <Input
                  id="assign-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("assignments.create.subjectPlaceholder")}
                  list="assign-subjects"
                />
                <datalist id="assign-subjects">
                  {COMMON_SUBJECTS.map((s) => (
                    <option key={s.en} value={`${s.en} ${s.zh}`} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-due">{t("assignments.create.dueDateLabel")}</Label>
                <Input
                  id="assign-due"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-desc">{t("assignments.create.descriptionLabel")}</Label>
              <Textarea
                id="assign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("assignments.create.descriptionPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          {/* Roster picker */}
          <div className="border-t pt-3">
            <Label className="text-sm font-medium mb-2 block">
              {t("assignments.create.selectStudents")}
            </Label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Preset (saved roster) bar — shown even with no classes of
                    your own; presets may target students outside them */}
                {presets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Select onValueChange={applyPreset}>
                      <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
                        <SelectValue placeholder={t("assignments.presets.applyPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.studentCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Save current selection as a preset (admin/super-admin only) */}
                {canSavePreset &&
                  (showSavePreset ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      autoFocus
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder={t("assignments.presets.namePlaceholder")}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePreset()
                      }}
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleSavePreset}
                      disabled={savingPreset || selectedIds.size === 0}
                    >
                      {savingPreset ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowSavePreset(false)
                        setPresetName("")
                      }}
                    >
                      {t("assignments.cancel")}
                    </Button>
                  </div>
                ) : (
                  selectedIds.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mb-2 h-8 text-xs"
                      onClick={() => setShowSavePreset(true)}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                      {t("assignments.presets.saveAs")}
                    </Button>
                  )
                ))}

                {groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {presets.length > 0
                      ? t("assignments.create.noClassesHint")
                      : t("assignments.create.noStudents")}
                  </div>
                ) : (
                  <RecipientPicker
                    groups={groups}
                    selectedIds={selectedIds}
                    onChange={setSelectedIds}
                    searchPlaceholder={t("assignments.create.searchStudents")}
                    selectAllLabel={t("assignments.create.selectAll")}
                    deselectAllLabel={t("assignments.create.deselectAll")}
                    listClassName="max-h-[50vh] border rounded p-2"
                    nestedScroll
                  />
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("assignments.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              selectedIds.size === 0 ||
              loading ||
              !title.trim()
            }
          >
            {submitting
              ? t("assignments.create.creating")
              : t("assignments.create.submit", { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
