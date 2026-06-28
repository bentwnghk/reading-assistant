"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, Building2, Loader2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import type { ReadingHistory } from "@/store/history"
import type { ShareTargetGroup } from "@/lib/shared-sessions"

interface AssignRosterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ReadingHistory | null
}

const COMMON_SUBJECTS: Array<{ en: string; zh: string }> = [
  { en: "History", zh: "歷史" },
  { en: "Geography", zh: "地理" },
  { en: "Science", zh: "科學" },
  { en: "Biology", zh: "生物" },
  { en: "Chemistry", zh: "化學" },
  { en: "Physics", zh: "物理" },
  { en: "Math", zh: "數學" },
  { en: "CES", zh: "公經社" },
  { en: "ICT", zh: "電腦" },
  { en: "RS", zh: "宗教" },
  { en: "Music", zh: "音樂" },
  { en: "Other", zh: "其他" },
]

export default function AssignRosterDialog({
  open,
  onOpenChange,
  session,
}: AssignRosterDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const [groups, setGroups] = useState<ShareTargetGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("")
  const [dueDate, setDueDate] = useState("")

  useEffect(() => {
    if (!open) {
      setGroups([])
      setSelectedIds(new Set())
      setSearch("")
      setTitle("")
      setDescription("")
      setSubject("")
      setDueDate("")
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
  }, [open, session])

  const hasSchools = groups.some((g) => g.schoolId)

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        users: g.users.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.users.length > 0)
  }, [groups, search])

  const filteredGroupedBySchool = useMemo(() => {
    if (!hasSchools) return [{ schoolId: undefined, schoolName: undefined, groups: filteredGroups }]
    const map = new Map<string | undefined, typeof filteredGroups>()
    for (const g of filteredGroups) {
      const key = g.schoolId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    }
    return [...map.entries()].map(([schoolId, schoolGroups]) => ({
      schoolId,
      schoolName: schoolGroups[0]?.schoolName,
      groups: schoolGroups,
    }))
  }, [filteredGroups, hasSchools])

  const allFilteredIds = useMemo(
    () => new Set(filteredGroups.flatMap((g) => g.users.map((u) => u.id))),
    [filteredGroups],
  )

  const allSelected =
    allFilteredIds.size > 0 &&
    [...allFilteredIds].every((id) => selectedIds.has(id))

  const toggleUser = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

  const toggleGroup = useCallback((group: ShareTargetGroup) => {
    const groupIds = group.users.map((u) => u.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allGroupSelected = groupIds.every((id) => next.has(id))
      if (allGroupSelected) groupIds.forEach((id) => next.delete(id))
      else groupIds.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(allFilteredIds)
  }, [allSelected, allFilteredIds])

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

        <div className="space-y-4">
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
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("assignments.create.noStudents")}
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("assignments.create.searchStudents")}
                    className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {filteredGroups.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="assign-select-all"
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                    <label
                      htmlFor="assign-select-all"
                      className="text-sm cursor-pointer select-none"
                    >
                      {allSelected
                        ? t("assignments.create.deselectAll")
                        : t("assignments.create.selectAll")}
                      <span className="ml-2 text-muted-foreground">
                        ({selectedIds.size})
                      </span>
                    </label>
                  </div>
                )}

                <div className="max-h-[50vh] overflow-auto border rounded p-2">
                  <div className="space-y-4">
                    {filteredGroupedBySchool.map((schoolBlock) => (
                      <div key={schoolBlock.schoolId ?? "__none__"}>
                        {hasSchools && (
                          <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold">
                              {schoolBlock.schoolName || "Other"}
                            </span>
                          </div>
                        )}
                        <div className="space-y-3">
                          {schoolBlock.groups.map((group) => {
                            const groupIds = group.users.map((u) => u.id)
                            const groupAllSelected = groupIds.every((id) =>
                              selectedIds.has(id),
                            )
                            const groupSomeSelected =
                              groupIds.some((id) => selectedIds.has(id)) &&
                              !groupAllSelected

                            return (
                              <div key={group.classId || group.label}>
                                {(schoolBlock.groups.length > 1 || hasSchools) && (
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Checkbox
                                      id={`assign-group-${group.classId || group.label}`}
                                      checked={
                                        groupAllSelected
                                          ? true
                                          : groupSomeSelected
                                            ? "indeterminate"
                                            : false
                                      }
                                      onCheckedChange={() => toggleGroup(group)}
                                    />
                                    <label
                                      htmlFor={`assign-group-${group.classId || group.label}`}
                                      className="text-sm font-medium cursor-pointer select-none"
                                    >
                                      {group.label}
                                    </label>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  {group.users.map((user) => (
                                    <div
                                      key={user.id}
                                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                                    >
                                      <Checkbox
                                        id={`assign-user-${user.id}`}
                                        checked={selectedIds.has(user.id)}
                                        onCheckedChange={() => toggleUser(user.id)}
                                      />
                                      <label
                                        htmlFor={`assign-user-${user.id}`}
                                        className="text-sm cursor-pointer select-none flex-1 min-w-0"
                                      >
                                        <span className="truncate block">
                                          {user.name || user.email || user.id}
                                        </span>
                                        {user.email && (
                                          <span className="block text-xs text-muted-foreground truncate">
                                            {user.email}
                                          </span>
                                        )}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
