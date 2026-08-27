"use client"

import * as React from "react"
import { Bookmark, ChevronsUpDown, GraduationCap, Layers, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/utils/style"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ClassComboboxClass {
  id: string
  name: string
  subjectName?: string
  subjectSortOrder?: number
  gradeName?: string
  gradeSortOrder?: number
  teacherName?: string
  schoolName?: string
}

interface ClassOption extends ClassComboboxClass {
  keywords: string
}

function toOptions(classes: ClassComboboxClass[]): ClassOption[] {
  return classes.map(c => ({
    ...c,
    keywords: [c.name, c.subjectName, c.gradeName, c.teacherName, c.schoolName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }))
}

/**
 * Canonical class display label: Form/Grade · Subject · Class Name
 * (e.g. "S5 · English · Gp1"). Missing parts are skipped.
 */
export function formatClassLabel(c: { name: string; subjectName?: string; gradeName?: string }): string {
  const parts: string[] = []
  if (c.gradeName) parts.push(c.gradeName)
  if (c.subjectName) parts.push(c.subjectName)
  parts.push(c.name)
  return parts.join(" · ")
}

function classLabel(c: ClassComboboxClass): string {
  return formatClassLabel(c)
}

/**
 * Orders classes within a subject group: by the school's form/grade sort
 * order when available, falling back to grade name then class name.
 */
function compareByGradeThenName(a: ClassOption, b: ClassOption): number {
  const ao = a.gradeSortOrder ?? Number.MAX_SAFE_INTEGER
  const bo = b.gradeSortOrder ?? Number.MAX_SAFE_INTEGER
  if (ao !== bo) return ao - bo
  return (a.gradeName || "").localeCompare(b.gradeName || "") || a.name.localeCompare(b.name)
}

/**
 * Groups classes by subject (then grade) for hierarchical display.
 * Subject groups are ordered by the school's subject sort order (falling back
 * to name); classes within a group by grade sort order then names. Classes
 * without subject/grade land in the ungrouped bucket at the end.
 */
function groupBySubject(classes: ClassOption[]): Array<{ label: string; classes: ClassOption[] }> {
  const groups = new Map<string, { classes: ClassOption[] }>()
  for (const c of classes) {
    const key = c.subjectName || ""
    if (!groups.has(key)) {
      groups.set(key, { classes: [] })
    }
    groups.get(key)!.classes.push(c)
  }
  const result: Array<{ label: string; classes: ClassOption[]; groupOrder?: number }> = []
  const unlabeled = groups.get("")
  for (const [key, entry] of groups) {
    if (key === "") continue
    entry.classes.sort(compareByGradeThenName)
    // All classes in a subject group share its sortOrder; take the group's min.
    const groupOrder = Math.min(...entry.classes.map(c => c.subjectSortOrder ?? Number.MAX_SAFE_INTEGER))
    result.push({ label: key, classes: entry.classes, groupOrder })
  }
  result.sort((a, b) =>
    (a.groupOrder ?? Number.MAX_SAFE_INTEGER) - (b.groupOrder ?? Number.MAX_SAFE_INTEGER) ||
    a.label.localeCompare(b.label)
  )
  if (unlabeled) {
    unlabeled.classes.sort(compareByGradeThenName)
    result.push({ label: "", classes: unlabeled.classes })
  }
  return result
}

function CommandClassList({
  options,
  itemId,
  renderItem,
  emptyLabel,
  footer,
}: {
  options: ClassOption[]
  itemId: (c: ClassOption) => string
  renderItem: (c: ClassOption, secondaryLabel: string | undefined) => React.ReactNode
  emptyLabel: string
  footer?: React.ReactNode
}) {
  const groups = groupBySubject(options)
  // When the list spans multiple schools, show the school as secondary text
  // (super-admin scope); otherwise the teacher name (school-wide scope).
  const multiSchool = new Set(
    options.map((c) => c.schoolName).filter((s): s is string => !!s)
  ).size > 1
  const secondaryFor = (c: ClassOption): string | undefined =>
    multiSchool && c.schoolName ? c.schoolName : c.teacherName
  return (
    <CommandList className="max-h-72">
      <CommandEmpty>{emptyLabel}</CommandEmpty>
      {groups.map((g, gi) => (
        <CommandGroup
          key={g.label || "ungrouped"}
          value={g.label || "ungrouped"}
          heading={g.label || undefined}
        >
          {g.classes.map(c => (
            <CommandItem key={itemId(c)} value={`${c.keywords} ${itemId(c)}`} onSelect={() => {}}>
              {renderItem(c, secondaryFor(c))}
            </CommandItem>
          ))}
          {gi < groups.length - 1 && <div className="h-1" />}
        </CommandGroup>
      ))}
      {footer}
    </CommandList>
  )
}

// ─── Single-select ────────────────────────────────────────────────────────────

export interface ClassComboboxProps {
  classes: ClassComboboxClass[]
  value: string | null | undefined
  onChange: (classId: string | null) => void
  placeholder?: string
  emptyLabel?: string
  allLabel?: string
  /** Show an "All classes" option that selects null. Default: false */
  allowAll?: boolean
  /** Show a "No class" option that selects the "__none__" sentinel. Default: false */
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  className?: string
}

export function ClassCombobox({
  classes,
  value,
  onChange,
  placeholder,
  emptyLabel,
  allLabel,
  allowAll = false,
  allowNone = false,
  noneLabel,
  disabled = false,
  className,
}: ClassComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const options = React.useMemo(() => toOptions(classes), [classes])
  const selected = options.find(c => c.id === value)
  const noneOptionLabel = noneLabel ?? t("classCombobox.noClass")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && value !== "__none__" && "text-muted-foreground", className)}
        >
          <span className="truncate">
            {allowAll && (value === "all" || value == null)
              ? allLabel ?? t("classCombobox.all")
              : value === "__none__"
                ? noneOptionLabel
                : selected
                  ? classLabel(selected)
                  : placeholder ?? t("classCombobox.selectClass")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="start"
        // Mobile: when opened inside a Dialog, the dialog's scroll-lock
        // (react-remove-scroll) preventDefaults touchmoves on this portaled
        // ("outside") content at the document level, breaking touch scrolling.
        // Stopping propagation here only is enough — native scrolling is untouched.
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={t("classCombobox.search")} />
          <CommandClassList
            options={options}
            itemId={c => c.id}
            emptyLabel={emptyLabel ?? t("classCombobox.empty")}
            renderItem={(c, secondary) => (
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                }}
              >
                <Users className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{classLabel(c)}</span>
                {secondary && (
                  <span className="max-w-24 truncate text-xs text-muted-foreground">{secondary}</span>
                )}
                <span className="h-4 w-4 shrink-0">
                  {value === c.id && <Layers className="h-4 w-4 text-primary" />}
                </span>
              </button>
            )}
          />
          {allowNone && (
            <div className={allowAll ? "" : "border-t"}>
              <CommandItem
                value={noneOptionLabel}
                onSelect={() => {
                  onChange("__none__")
                  setOpen(false)
                }}
              >
                <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1">{noneOptionLabel}</span>
                {value === "__none__" && <Layers className="h-4 w-4 text-primary" />}
              </CommandItem>
            </div>
          )}
          {allowAll && (
            <div className="border-t p-1">
              <CommandItem
                value={allLabel ?? t("classCombobox.all")}
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <GraduationCap className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1">{allLabel ?? t("classCombobox.all")}</span>
              </CommandItem>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Multi-select ─────────────────────────────────────────────────────────────

export interface ClassMultiSelectProps {
  classes: ClassComboboxClass[]
  value: string[]
  onChange: (classIds: string[]) => void
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
}

export function ClassMultiSelect({
  classes,
  value,
  onChange,
  placeholder,
  emptyLabel,
  disabled = false,
  className,
}: ClassMultiSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const options = React.useMemo(() => toOptions(classes), [classes])
  const valueSet = React.useMemo(() => new Set(value), [value])
  const selectedNames = React.useMemo(
    () => options.filter(c => valueSet.has(c.id)),
    [options, valueSet]
  )

  const toggle = (id: string) => {
    onChange(valueSet.has(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", selectedNames.length === 0 && "text-muted-foreground", className)}
        >
          <span className="flex flex-wrap items-center gap-1 truncate">
            {selectedNames.length === 0
              ? placeholder ?? t("classCombobox.selectClasses")
              : selectedNames.map(c => (
                  <Badge key={c.id} variant="secondary" className="font-normal">
                    {classLabel(c)}
                  </Badge>
                ))}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="start"
        // Mobile: when opened inside a Dialog, the dialog's scroll-lock
        // (react-remove-scroll) preventDefaults touchmoves on this portaled
        // ("outside") content at the document level, breaking touch scrolling.
        // Stopping propagation here only is enough — native scrolling is untouched.
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={t("classCombobox.search")} />
          <CommandClassList
            options={options}
            itemId={c => c.id}
            emptyLabel={emptyLabel ?? t("classCombobox.empty")}
            renderItem={(c, secondary) => (
              <label className="flex w-full cursor-pointer items-center gap-2">
                <Checkbox
                  checked={valueSet.has(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="flex-1 truncate">{classLabel(c)}</span>
                {secondary && (
                  <span className="max-w-24 truncate text-xs text-muted-foreground">{secondary}</span>
                )}
              </label>
            )}
          />
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Battle target (class OR roster) ─────────────────────────────────────────

export interface BattleRosterTarget {
  id: string
  name: string
  studentCount?: number
}

export interface ClassBattleTargetComboboxProps {
  classes: ClassComboboxClass[]
  rosters: BattleRosterTarget[]
  /** Composite value: "class:<id>" | "preset:<id>" | "" */
  value: string
  onChange: (compositeValue: string) => void
  placeholder?: string
  emptyLabel?: string
  searchPlaceholder?: string
  rostersLabel?: string
  rosterCountLabel?: (count: number) => string
  disabled?: boolean
  className?: string
}

/**
 * Searchable picker for multiplayer class-battle targets: classes (grouped
 * by subject/form) plus saved rosters. Emits composite "class:<id>" /
 * "preset:<id>" values, mirroring the previous Select's value scheme.
 */
export function ClassBattleTargetCombobox({
  classes,
  rosters,
  value,
  onChange,
  placeholder,
  emptyLabel,
  searchPlaceholder,
  rostersLabel,
  rosterCountLabel,
  disabled = false,
  className,
}: ClassBattleTargetComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const options = React.useMemo(() => toOptions(classes), [classes])
  const rosterList = React.useMemo(
    () => [...rosters].sort((a, b) => a.name.localeCompare(b.name)),
    [rosters],
  )

  const selectedKind = value.includes(":") ? value.slice(0, value.indexOf(":")) : ""
  const selectedId = value.includes(":") ? value.slice(value.indexOf(":") + 1) : ""
  const selectedClass = selectedKind === "class" ? options.find(c => c.id === selectedId) : undefined
  const selectedRoster = selectedKind === "preset" ? rosters.find(r => r.id === selectedId) : undefined

  const select = (composite: string) => {
    onChange(composite)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selectedClass && !selectedRoster && "text-muted-foreground", className)}
        >
          <span className="truncate">
            {selectedClass
              ? classLabel(selectedClass)
              : selectedRoster
                ? rosterCountLabel
                  ? `${selectedRoster.name} · ${rosterCountLabel(selectedRoster.studentCount ?? 0)}`
                  : selectedRoster.name
                : placeholder ?? t("classCombobox.selectClass")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="start"
        // Mobile: when opened inside a Dialog, the dialog's scroll-lock
        // (react-remove-scroll) preventDefaults touchmoves on this portaled
        // ("outside") content at the document level, breaking touch scrolling.
        // Stopping propagation here only is enough — native scrolling is untouched.
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("classCombobox.search")} />
          <CommandClassList
            options={options}
            itemId={c => `class-${c.id}`}
            emptyLabel={emptyLabel ?? t("classCombobox.empty")}
            renderItem={(c, secondary) => (
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => select(`class:${c.id}`)}
              >
                <Users className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{classLabel(c)}</span>
                {secondary && (
                  <span className="max-w-24 truncate text-xs text-muted-foreground">{secondary}</span>
                )}
                <span className="h-4 w-4 shrink-0">
                  {selectedKind === "class" && selectedId === c.id && (
                    <Layers className="h-4 w-4 text-primary" />
                  )}
                </span>
              </button>
            )}
            footer={
              rosterList.length > 0 ? (
                <CommandGroup
                  value="rosters"
                  heading={rostersLabel ?? t("classCombobox.rosters")}
                >
                  {rosterList.map(r => (
                    <CommandItem
                      key={`preset-${r.id}`}
                      value={`preset ${r.name.toLowerCase()}`}
                      onSelect={() => {}}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 text-left"
                        onClick={() => select(`preset:${r.id}`)}
                      >
                        <Bookmark className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="flex-1 truncate">{r.name}</span>
                        {typeof r.studentCount === "number" && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {r.studentCount}
                          </span>
                        )}
                        <span className="h-4 w-4 shrink-0">
                          {selectedKind === "preset" && selectedId === r.id && (
                            <Layers className="h-4 w-4 text-primary" />
                          )}
                        </span>
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : options.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {emptyLabel ?? t("classCombobox.empty")}
                </div>
              ) : undefined
            }
          />
        </Command>
      </PopoverContent>
    </Popover>
  )
}
