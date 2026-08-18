"use client"

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import {
  Archive,
  ArchiveRestore,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/utils/style"

type SortKey =
  | "teacher"
  | "roster"
  | "subject"
  | "school"
  | "dueDate"
  | "createdAt"
type StatusFilter = "all" | "active" | "archived"

const CUSTOM_ROSTER_VALUE = "__custom__"

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

function SortableHead({
  col,
  current,
  dir,
  onSort,
  className,
  children,
}: {
  col: SortKey
  current: SortKey
  dir: "asc" | "desc"
  onSort: (col: SortKey) => void
  className?: string
  children: React.ReactNode
}) {
  const active = col === current
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-foreground transition-colors select-none w-full"
      >
        <span className="flex-1">{children}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            active ? "text-foreground" : "text-muted-foreground/50"
          }`}
        />
      </button>
    </TableHead>
  )
}

/**
 * School-wide assignment oversight table (admin / super-admin "All Teachers"
 * tab). Shows every assignment created by teachers in the school with the
 * creating teacher and derived roster name (e.g. "S3A"), plus filtering by
 * teacher / roster / status, sorting, and vocabulary-style pagination.
 */
export default function SchoolAssignmentsTable({
  assignments,
  loading,
  currentUserId,
  isSuperAdmin,
  onEdit,
  onArchive,
  onDelete,
}: {
  assignments: Assignment[]
  loading: boolean
  currentUserId: string
  isSuperAdmin: boolean
  onEdit: (a: Assignment) => void
  onArchive: (a: Assignment, archive: boolean) => void
  onDelete: (a: Assignment) => void
}) {
  const { t, i18n } = useTranslation()
  const [teacherFilter, setTeacherFilter] = useState("all")
  const [rosterFilter, setRosterFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      if (!map.has(a.teacherId)) {
        map.set(a.teacherId, a.teacherName || a.teacherId)
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((x, y) => x.name.localeCompare(y.name))
  }, [assignments])

  const rosterOptions = useMemo(() => {
    const names = new Set<string>()
    for (const a of assignments) {
      if (a.rosterName) names.add(a.rosterName)
    }
    return [...names].sort((x, y) => x.localeCompare(y))
  }, [assignments])

  const subjectOptions = useMemo(() => {
    const names = new Set<string>()
    for (const a of assignments) {
      const s = a.subject?.trim()
      if (s) names.add(s)
    }
    return [...names].sort((x, y) => x.localeCompare(y))
  }, [assignments])

  const schoolOptions = useMemo(() => {
    const names = new Set<string>()
    for (const a of assignments) {
      if (a.schoolName) names.add(a.schoolName)
    }
    return [...names].sort((x, y) => x.localeCompare(y))
  }, [assignments])

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (teacherFilter !== "all" && a.teacherId !== teacherFilter) return false
      if (rosterFilter === CUSTOM_ROSTER_VALUE) {
        if (a.rosterName) return false
      } else if (rosterFilter !== "all" && a.rosterName !== rosterFilter) {
        return false
      }
      if (subjectFilter !== "all" && (a.subject?.trim() || "") !== subjectFilter) {
        return false
      }
      if (schoolFilter !== "all" && (a.schoolName || "") !== schoolFilter) {
        return false
      }
      if (statusFilter !== "all" && a.status !== statusFilter) return false
      return true
    })
  }, [assignments, teacherFilter, rosterFilter, subjectFilter, schoolFilter, statusFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "teacher":
          return (
            (a.teacherName || "").localeCompare(b.teacherName || "") * dir
          )
        case "roster": {
          // Unmatched ("Custom") rosters always sort last
          if (!a.rosterName && !b.rosterName) return 0
          if (!a.rosterName) return 1
          if (!b.rosterName) return -1
          return a.rosterName.localeCompare(b.rosterName) * dir
        }
        case "subject": {
          // Missing subjects always sort last
          const as = a.subject?.trim() || ""
          const bs = b.subject?.trim() || ""
          if (!as && !bs) return 0
          if (!as) return 1
          if (!bs) return -1
          return as.localeCompare(bs) * dir
        }
        case "school": {
          // Missing school names always sort last
          if (!a.schoolName && !b.schoolName) return 0
          if (!a.schoolName) return 1
          if (!b.schoolName) return -1
          return a.schoolName.localeCompare(b.schoolName) * dir
        }
        case "dueDate": {
          // Missing due dates always sort last
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return (
            (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir
          )
        }
        case "createdAt":
        default:
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            dir
          )
      }
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  // Title + Teacher + Roster + Subject + Progress + Due + Status + Created + Actions
  const colCount = isSuperAdmin ? 10 : 9

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "createdAt" || key === "dueDate" ? "desc" : "asc")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t("assignments.schoolView.empty")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {isSuperAdmin && (
          <Select
            value={schoolFilter}
            onValueChange={(v) => {
              setSchoolFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[150px] text-xs">
              <SelectValue placeholder={t("assignments.schoolView.allSchools")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("assignments.schoolView.allSchools")}
              </SelectItem>
              {schoolOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={teacherFilter}
          onValueChange={(v) => {
            setTeacherFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
            <SelectValue placeholder={t("assignments.schoolView.allTeachers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("assignments.schoolView.allTeachers")}
            </SelectItem>
            {teacherOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={rosterFilter}
          onValueChange={(v) => {
            setRosterFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
            <SelectValue placeholder={t("assignments.schoolView.allRosters")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("assignments.schoolView.allRosters")}
            </SelectItem>
            {rosterOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_ROSTER_VALUE}>
              {t("assignments.schoolView.customRoster")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={subjectFilter}
          onValueChange={(v) => {
            setSubjectFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
            <SelectValue placeholder={t("assignments.schoolView.allSubjects")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("assignments.schoolView.allSubjects")}
            </SelectItem>
            {subjectOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder={t("assignments.schoolView.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("assignments.schoolView.allStatuses")}
            </SelectItem>
            <SelectItem value="active">
              {t("assignments.status.active")}
            </SelectItem>
            <SelectItem value="archived">
              {t("assignments.status.archived")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">
                {t("assignments.schoolView.colTitle")}
              </TableHead>
              {isSuperAdmin && (
                <SortableHead
                  col="school"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="min-w-[130px]"
                >
                  {t("assignments.schoolView.colSchool")}
                </SortableHead>
              )}
              <SortableHead
                col="teacher"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="min-w-[140px]"
              >
                {t("assignments.schoolView.colTeacher")}
              </SortableHead>
              <SortableHead
                col="roster"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="min-w-[110px]"
              >
                {t("assignments.schoolView.colRoster")}
              </SortableHead>
              <SortableHead
                col="subject"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="min-w-[110px]"
              >
                {t("assignments.schoolView.colSubject")}
              </SortableHead>
              <TableHead className="w-28">
                {t("assignments.schoolView.colProgress")}
              </TableHead>
              <SortableHead
                col="dueDate"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="min-w-[120px]"
              >
                {t("assignments.schoolView.colDueDate")}
              </SortableHead>
              <TableHead className="w-24">
                {t("assignments.schoolView.colStatus")}
              </TableHead>
              <SortableHead
                col="createdAt"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="min-w-[120px]"
              >
                {t("assignments.schoolView.colCreated")}
              </SortableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("assignments.schoolView.emptyFiltered")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((a) => {
                const overdue =
                  a.status === "active" &&
                  isOverdue(a.dueDate) &&
                  (a.avgProgress ?? 0) < 100
                const canManage = a.teacherId === currentUserId || isSuperAdmin
                return (
                  <TableRow key={a.id} className={a.status === "archived" ? "opacity-60" : ""}>
                    <TableCell>
                      <Link
                        href={`/assignments/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        <span className="block truncate max-w-[220px]">
                          {a.title}
                        </span>
                      </Link>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-muted-foreground">
                        <span className="block truncate max-w-[130px]">
                          {a.schoolName || "—"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {a.teacherName || a.teacherId}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.rosterName ? (
                        <Badge variant="outline">{a.rosterName}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("assignments.schoolView.customRoster")}
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t("assignments.teacherView.studentCount", {
                          count: a.studentCount ?? 0,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block truncate max-w-[120px]">
                        {a.subject || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${a.avgProgress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">
                          {a.avgProgress ?? 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.dueDate ? (
                        <span
                          className={`inline-flex items-center gap-1 text-sm ${
                            overdue ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(a.dueDate, i18n.language)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.status === "active" ? "default" : "secondary"}
                      >
                        {t(`assignments.status.${a.status}`)}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="ml-1">
                          {t("assignments.teacherView.overdue")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt, i18n.language)}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={t("assignments.teacherView.edit")}
                            onClick={() => onEdit(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={
                              a.status === "active"
                                ? t("assignments.teacherView.archive")
                                : t("assignments.teacherView.unarchive")
                            }
                            onClick={() => onArchive(a, a.status === "active")}
                          >
                            {a.status === "active" ? (
                              <Archive className="h-4 w-4" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title={t("assignments.teacherView.delete")}
                            onClick={() => onDelete(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("vocabulary.rowsPerPage")}:
            </span>
            {[10, 20, 30, 50].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size)
                  setPage(1)
                }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded transition-colors",
                  pageSize === size
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true
                if (p === 1 || p === totalPages) return true
                return Math.abs(p - safePage) <= 1
              })
              .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("ellipsis")
                }
                acc.push(p)
                return acc
              }, [])
              .map((item, i) =>
                item === "ellipsis" ? (
                  <span
                    key={`e${i}`}
                    className="text-xs text-muted-foreground px-1"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={cn(
                      "h-7 w-7 text-xs rounded transition-colors",
                      safePage === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3 w-3" />
        {t("assignments.schoolView.rosterNote")}
      </p>
    </div>
  )
}
