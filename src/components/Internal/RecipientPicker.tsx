"use client"

import { useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Building2, ChevronDown, Search } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ShareTargetGroup } from "@/lib/shared-sessions"

interface RecipientPickerProps {
  groups: ShareTargetGroup[]
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  searchPlaceholder?: string
  selectAllLabel?: string
  deselectAllLabel?: string
  /** Classes on the scroll container (default: max-h-64) */
  listClassName?: string
}

const groupKey = (g: ShareTargetGroup) => g.classId || g.label

/**
 * Searchable, collapsible recipient picker for share/assign dialogs.
 *
 * Renders school blocks (when groups span schools) → collapsible class groups
 * (select-all per group, subject/form context, selected counts) → student rows.
 * Groups auto-collapse when there are many; searching expands matching groups.
 * A student in multiple classes appears in each group; the selectedIds Set
 * dedupes them.
 */
export function RecipientPicker({
  groups,
  selectedIds,
  onChange,
  searchPlaceholder,
  selectAllLabel,
  deselectAllLabel,
  listClassName = "max-h-64",
}: RecipientPickerProps) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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

  const searching = search.trim().length > 0

  const groupedBySchool = useMemo(() => {
    if (!hasSchools) {
      return [{ schoolId: undefined, schoolName: undefined, groups: filteredGroups }]
    }
    const map = new Map<string | undefined, typeof filteredGroups>()
    for (const g of filteredGroups) {
      if (!map.has(g.schoolId)) map.set(g.schoolId, [])
      map.get(g.schoolId)!.push(g)
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

  // Collapse by default once the group list gets long; searching overrides.
  const defaultCollapsed = groups.length > 8

  const toggleUser = (userId: string) => {
    const next = new Set(selectedIds)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    onChange(next)
  }

  const toggleGroup = (userIds: string[]) => {
    const next = new Set(selectedIds)
    const allSelectedInGroup = userIds.every((id) => next.has(id))
    if (allSelectedInGroup) userIds.forEach((id) => next.delete(id))
    else userIds.forEach((id) => next.add(id))
    onChange(next)
  }

  const toggleAll = () => {
    if (allSelected) onChange(new Set())
    else onChange(allFilteredIds)
  }

  const isExpanded = (key: string) =>
    searching ? true : !(collapsed[key] ?? defaultCollapsed)

  return (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder ?? t("share.searchUsers")}
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filteredGroups.length > 1 && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-select-all`}
            checked={allSelected}
            onCheckedChange={toggleAll}
          />
          <label
            htmlFor={`${idPrefix}-select-all`}
            className="text-sm cursor-pointer select-none"
          >
            {allSelected
              ? deselectAllLabel ?? t("share.deselectAll")
              : selectAllLabel ?? t("share.selectAll")}
            <span className="ml-2 text-muted-foreground">
              ({selectedIds.size})
            </span>
          </label>
        </div>
      )}

      <ScrollArea className={listClassName}>
        <div className="space-y-4 pr-3">
          {filteredGroups.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {t("share.noMatches")}
            </div>
          )}
          {groupedBySchool.map((schoolBlock) => (
            <div key={schoolBlock.schoolId ?? "__none__"}>
              {hasSchools && (
                <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">
                    {schoolBlock.schoolName || "Other"}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {schoolBlock.groups.map((group) => {
                  const key = groupKey(group)
                  const userIds = group.users.map((u) => u.id)
                  const selectedCount = userIds.filter((id) =>
                    selectedIds.has(id),
                  ).length
                  const groupAllSelected = userIds.every((id) =>
                    selectedIds.has(id),
                  )
                  const groupSomeSelected =
                    selectedCount > 0 && !groupAllSelected
                  const open = isExpanded(key)
                  const metaParts = [group.gradeName, group.subjectName]
                    .filter(Boolean)
                    .join(" · ")

                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 py-1">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() =>
                            setCollapsed((prev) => ({
                              ...prev,
                              [key]: open,
                            }))
                          }
                          className="flex flex-1 items-center gap-1.5 min-w-0 text-left cursor-pointer"
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                          />
                          <span className="text-sm font-medium truncate">
                            {group.classId
                              ? t("share.classGroup", { name: group.label })
                              : group.label}
                          </span>
                          {metaParts && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                              {metaParts}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground shrink-0">
                            {selectedCount > 0 ? `${selectedCount}/` : ""}
                            {userIds.length}
                          </span>
                        </button>
                        <Checkbox
                          id={`${idPrefix}-group-${key}`}
                          checked={
                            groupAllSelected
                              ? true
                              : groupSomeSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() => toggleGroup(userIds)}
                        />
                      </div>
                      {open && (
                        <div className="space-y-1 ml-5">
                          {group.users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                id={`${idPrefix}-user-${user.id}`}
                                checked={selectedIds.has(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <label
                                htmlFor={`${idPrefix}-user-${user.id}`}
                                className="text-sm cursor-pointer select-none flex-1 min-w-0"
                              >
                                <span className="truncate block">
                                  {user.name || user.email || user.id}
                                </span>
                                {user.email && user.name && (
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  )
}
