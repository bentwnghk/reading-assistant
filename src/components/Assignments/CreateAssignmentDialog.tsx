"use client"

import { useState, useEffect, useLayoutEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Loader2,
  BookmarkPlus,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  BookOpen,
} from "lucide-react"
import Fuse from "fuse.js"
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
import SearchArea from "@/components/Internal/SearchArea"
import { RecipientPicker } from "@/components/Internal/RecipientPicker"
import { useHistoryStore, type ReadingHistory } from "@/store/history"
import { calculateProgress } from "@/utils/progress"
import { cn } from "@/utils/style"
import type { ShareTargetGroup } from "@/lib/shared-sessions"

interface CreateAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional pre-selected source session (the Learning Journey
   * "Assign as homework" shortcut). When provided, the wizard starts on
   * the setup step with the session already chosen.
   */
  session?: ReadingHistory | null
}

type WizardStep = "pick" | "setup"

const PAGE_SIZE = 20

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

function deriveTitle(session: ReadingHistory | null | undefined): string {
  return session?.docTitle || session?.extractedText?.slice(0, 80) || ""
}

function formatDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function CreateAssignmentDialog({
  open,
  onOpenChange,
  session,
}: CreateAssignmentDialogProps) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { data: authSession } = useSession()
  // Only admins/super-admins can create presets; teachers may only apply them
  const canSavePreset =
    authSession?.user?.role === "admin" ||
    authSession?.user?.role === "super-admin"

  const { history, loadFromAPI } = useHistoryStore()

  // Wizard state
  const [step, setStep] = useState<WizardStep>("pick")
  const [selectedSession, setSelectedSession] = useState<ReadingHistory | null>(
    null,
  )

  // Step 1 (session picker) state — mirrors the SessionsTab list: Fuse
  // search over the lightweight history store + 20-per-page loading.
  const [searchValue, setSearchValue] = useState("")
  const [sessionList, setSessionList] = useState<ReadingHistory[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Step 2 state (details + roster)
  const [groups, setGroups] = useState<ShareTargetGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  // Whether the user typed their own assignment title. While untouched,
  // switching the source session re-prefills the title from it.
  const [titleTouched, setTitleTouched] = useState(false)
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
    if (open) {
      // A pre-selected session (Learning Journey "Assign as homework"
      // shortcut) skips straight to the setup step; the picker step
      // renders as done.
      setStep(session ? "setup" : "pick")
      setSelectedSession(session ?? null)
      setTitle(deriveTitle(session))
      setTitleTouched(false)
      setSearchValue("")
      setSessionList(useHistoryStore.getState().history.slice(0, PAGE_SIZE))
      setCurrentPage(1)
      setSessionsLoading(false)

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

      // AuthProvider populates the history store on sign-in; refetch when
      // the picker would otherwise render empty (e.g. that load failed).
      if (useHistoryStore.getState().history.length === 0) {
        setSessionsLoading(true)
        loadFromAPI().finally(() => setSessionsLoading(false))
      }
    } else {
      setStep("pick")
      setSelectedSession(null)
      setGroups([])
      setSelectedIds(new Set())
      setTitle("")
      setTitleTouched(false)
      setDescription("")
      setSubject("")
      setDueDate("")
      setShowSavePreset(false)
      setPresetName("")
      setAppliedPresetId(null)
      setSearchValue("")
      setSessionList([])
      setCurrentPage(1)
      setSessionsLoading(false)
    }
  }, [open, session, loadFromAPI])

  // Keep the picker list in sync with the history store (e.g. when the
  // open-time refetch lands). Same arrangement as SessionsTab.
  useLayoutEffect(() => {
    setSessionList(history.slice(0, PAGE_SIZE))
    setCurrentPage(1)
  }, [history])

  function handleSearch(value: string) {
    setSearchValue(value)
    if (!value.trim()) {
      setSessionList(history.slice(0, PAGE_SIZE))
      setCurrentPage(1)
      return
    }
    const options = { keys: ["docTitle", "extractedText", "summary"] }
    const index = Fuse.createIndex(options.keys, history)
    const fuse = new Fuse(history, options, index)
    setSessionList(fuse.search(value).map((v) => v.item))
  }

  function handleSearchClear() {
    setSearchValue("")
    setSessionList(history.slice(0, PAGE_SIZE))
    setCurrentPage(1)
  }

  function loadMoreSessions() {
    const nextPage = currentPage + 1
    setSessionList(history.slice(0, nextPage * PAGE_SIZE))
    setCurrentPage(nextPage)
  }

  function chooseSession(item: ReadingHistory) {
    if (selectedSession?.id === item.id) {
      // Clicking the already-selected row again advances.
      setStep("setup")
      return
    }
    setSelectedSession(item)
    // Re-prefill the title unless the user wrote their own.
    if (!titleTouched) setTitle(deriveTitle(item))
  }

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
    if (!selectedSession) return
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
        sourceSessionId: selectedSession.id,
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

  const sessionTitle = deriveTitle(selectedSession)

  const steps: Array<{
    id: WizardStep
    label: string
    done: boolean
    disabled: boolean
  }> = [
    {
      id: "pick",
      label: t("assignments.create.steps.pickSession"),
      done: step === "setup",
      disabled: false,
    },
    {
      id: "setup",
      label: t("assignments.create.steps.setup"),
      done: false,
      disabled: !selectedSession,
    },
  ]

  const showLoadMore = !searchValue && history.length > currentPage * PAGE_SIZE

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("assignments.create.title")}</DialogTitle>
          <DialogDescription>
            {step === "pick"
              ? t("assignments.create.pick.description")
              : t("assignments.create.setupDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator — same arrangement as the Writing Assessment
            "Scan → Review transcript → Assessment" indicator. */}
        <ol
          className="flex shrink-0 flex-wrap items-center gap-1.5 text-sm"
          aria-label={t("assignments.create.steps.label")}
        >
          {steps.map((s, i) => {
            const current = step === s.id
            return (
              <li key={s.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="h-px w-4 bg-border" aria-hidden />}
                <button
                  type="button"
                  disabled={s.disabled || current}
                  aria-current={current ? "step" : undefined}
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    current
                      ? "bg-primary/10 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                      current
                        ? "bg-primary text-primary-foreground"
                        : s.done
                          ? "bg-green-600 text-white"
                          : "border",
                    )}
                  >
                    {s.done && !current ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            )
          })}
        </ol>

        {step === "pick" ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            <SearchArea
              className="w-full"
              onChange={handleSearch}
              onClear={handleSearchClear}
            />
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessionList.length === 0 ? (
              history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("assignments.create.pick.empty")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      router.push("/")
                    }}
                  >
                    {t("assignments.create.pick.goHome")}
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t("assignments.create.pick.noMatches")}
                </div>
              )
            ) : (
              <>
                <div className="divide-y rounded-md border">
                  {sessionList.map((item) => {
                    const selected = selectedSession?.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseSession(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          selected ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : null,
                          )}
                          aria-hidden
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-medium"
                            title={
                              item.docTitle ||
                              item.extractedText?.slice(0, 100)
                            }
                          >
                            {item.docTitle ||
                              item.extractedText?.slice(0, 60) ||
                              t("assignments.create.pick.untitled")}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatDate(
                              item.updatedAt || item.createdAt,
                              i18n.language,
                            )}
                            {" · "}
                            {calculateProgress(item)}%
                            {" · "}
                            {t("assignments.create.pick.words", {
                              count: item.glossary?.length || 0,
                            })}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                {showLoadMore && (
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={loadMoreSessions}
                  >
                    {t("assignments.create.pick.loadMore")}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {/* Source session summary */}
            <div className="space-y-1.5">
              <Label>{t("assignments.create.sourceSession")}</Label>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={sessionTitle}>
                    {sessionTitle || t("assignments.create.pick.untitled")}
                  </p>
                  {selectedSession && (
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(
                        selectedSession.updatedAt || selectedSession.createdAt,
                        i18n.language,
                      )}
                      {" · "}
                      {calculateProgress(selectedSession)}%
                      {" · "}
                      {t("assignments.create.pick.words", {
                        count: selectedSession.glossary?.length || 0,
                      })}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setStep("pick")}
                  disabled={submitting}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                  {t("assignments.create.changeSession")}
                </Button>
              </div>
            </div>

            {/* Metadata fields */}
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-title">{t("assignments.create.titleLabel")}</Label>
                <Input
                  id="assign-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setTitleTouched(true)
                  }}
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
        )}

        <DialogFooter className="shrink-0">
          {step === "pick" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("assignments.cancel")}
              </Button>
              <Button
                onClick={() => setStep("setup")}
                disabled={!selectedSession}
              >
                {t("assignments.create.continue")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="sm:mr-auto"
                onClick={() => setStep("pick")}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("assignments.back")}
              </Button>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
