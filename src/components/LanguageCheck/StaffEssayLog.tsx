"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  LoaderCircle,
  PenLine,
  Pencil,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StaffEssayDialog from "@/components/LanguageCheck/StaffEssayDialog";
import TopicCombobox from "@/components/LanguageCheck/TopicCombobox";
import { Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import { STATUS_TONE } from "@/components/LanguageCheck/shared";
import {
  useLanguageCheckStore,
} from "@/store/languageCheck";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";
import {
  LANGUAGE_CHECK_STATUSES,
} from "@/constants/languageCheck";

interface StaffListResponse {
  rows: LanguageCheckStaffRow[];
  total: number;
  stats: LanguageCheckStaffStats;
  topics: LanguageCheckStaffTopic[];
}

interface StaffEssayLogProps {
  /** Shared class / student selection from the staff filter bar (null = all). */
  classId: string | null;
  userId: string | null;
}

/** Sortable columns of the student essays table (mirrors the server-side
 *  STAFF_ESSAY_SORT_FIELDS — client components cannot import from
 *  src/lib/language-check.ts, which pulls `pg`). */
type StaffSortField = "updated" | "student" | "title" | "overall";
type StaffSortOrder = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** Table-header sort button: label + direction arrow (ArrowUpDown when the
 *  column is not the active sort). */
function SortHeader({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: StaffSortField;
  sort: StaffSortField;
  order: StaffSortOrder;
  onSort: (field: StaffSortField) => void;
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="-ml-1 flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground"
    >
      {label}
      <Icon className={cn("h-3 w-3", !active && "opacity-60")} />
    </button>
  );
}

/**
 * Staff "Student essays" tab on /writing-assessment. Renders nothing for students.
 * Teachers see their classes' students, admins their school, super-admins
 * everyone. Class and student come from the shared staff filter bar; topic
 * and status are essay-specific and live here.
 */
export default function StaffEssayLog({ classId: classProp, userId: userProp }: StaffEssayLogProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [data, setData] = useState<StaffListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const classId = classProp ?? "all";
  const userId = userProp ?? "all";
  const [status, setStatus] = useState("all");
  const [topicId, setTopicId] = useState("all");
  const [sort, setSort] = useState<StaffSortField>("updated");
  const [order, setOrder] = useState<StaffSortOrder>("desc");
  const [openId, setOpenId] = useState<string | null>(null);
  // Inline title rename (staff-only affordance in the Title column). The
  // refs make commit idempotent across Enter→blur double fires and keep a
  // cancelled edit from persisting after the input unmounts.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const activeRenameRef = useRef<string | null>(null);
  const renameCancelledRef = useRef(false);
  // Topic re-link (staff-only affordance in the Topic column): the row being
  // re-linked, the picked topic, and the caller's Topic Library options
  // (lazy-loaded on first open — the filter dropdown's options are only the
  // topics in-scope essays were written on, useless for picking a new one).
  const [relinkRow, setRelinkRow] = useState<LanguageCheckStaffRow | null>(null);
  const [relinkPick, setRelinkPick] = useState<string | null>(null);
  const [relinking, setRelinking] = useState(false);
  const [libraryTopics, setLibraryTopics] = useState<LanguageCheckStaffTopic[] | null>(null);

  // A different class/student starts again from the first page, and drops
  // the topic pick — the topic options are narrowed by the class, so a
  // topic from another class would only show an empty table.
  const selectionKey = `${classId}|${userId}`;
  const [lastSelection, setLastSelection] = useState(selectionKey);
  if (lastSelection !== selectionKey) {
    setLastSelection(selectionKey);
    setPage(1);
    setTopicId("all");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
      });
      if (classId === "__mine__") params.set("mine", "1");
      else if (classId !== "all") params.set("classId", classId);
      if (userId !== "all") params.set("userId", userId);
      if (status !== "all") params.set("status", status);
      if (topicId !== "all") params.set("topicId", topicId);
      const res = await fetch(`/api/writing-assessment/staff?${params.toString()}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setData(body as StaffListResponse);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, classId, userId, status, topicId, sort, order]);

  // Role comes from the session, which loads asynchronously: while it is
  // still undefined the guard below skips the fetch, and the effect re-runs
  // once the role resolves — so students never hit the API (no console 403).
  const isStaff = role === "teacher" || role === "admin" || role === "super-admin";

  useEffect(() => {
    if (!isStaff) return;
    void load();
  }, [load, isStaff]);

  // --- Inline title rename (Title column) -------------------------------
  // Staff may rename any in-scope essay directly in the table. The title is
  // the per-essay snapshot (renaming never touches the Topic Library), and
  // the server bumps updated_at, so the row re-sorts on the next load; here
  // it is updated in place so the row does not jump mid-edit.
  function startRename(row: LanguageCheckStaffRow) {
    renameCancelledRef.current = false;
    activeRenameRef.current = row.id;
    setRenameValue(row.title);
    setRenamingId(row.id);
  }

  function cancelRename() {
    renameCancelledRef.current = true;
    setRenamingId(null);
  }

  async function commitRename(row: LanguageCheckStaffRow) {
    // Idempotent: Enter fires blur too, and Escape unmounts the input —
    // both arrive after the first commit/cancel has cleared the ref.
    if (activeRenameRef.current !== row.id) return;
    activeRenameRef.current = null;
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    setRenamingId(null);
    const next = renameValue.trim();
    if (!next || next === row.title) return;
    try {
      const res = await fetch(`/api/writing-assessment/staff/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setData((d) =>
        d
          ? {
              ...d,
              rows: d.rows.map((r) =>
                r.id === row.id ? { ...r, title: next } : r,
              ),
            }
          : d,
      );
      // The caller may be the uploader — their own essay list caches the
      // title too (same reasoning as the staff re-check).
      void useLanguageCheckStore.getState().loadList(true);
    } catch (error) {
      toast.error(parseError(error));
    }
  }

  // --- Topic re-link / unlink (link button in the Title column) ---------
  // Staff may re-point an essay at any topic from THEIR Topic Library (own
  // + class-visible — same resolution as an upload) or remove the link
  // entirely. The server re-snapshots the topic's task / essay type /
  // question image onto the essay; the essay title is untouched. Re-linking
  // to the SAME topic refreshes the snapshot from a possibly-edited library
  // entry.
  async function openRelink(row: LanguageCheckStaffRow) {
    setRelinkRow(row);
    setRelinkPick(row.topicId);
    if (libraryTopics) return;
    try {
      const res = await fetch("/api/writing-assessment/topics");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setLibraryTopics(
        (Array.isArray(body) ? body : []) as LanguageCheckStaffTopic[],
      );
    } catch (error) {
      toast.error(parseError(error));
    }
  }

  async function handleRelink() {
    if (!relinkRow || relinking) return;
    const row = relinkRow;
    setRelinking(true);
    try {
      // topicId null = unlink (remove the link entirely).
      const res = await fetch(`/api/writing-assessment/staff/${row.id}/topic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: relinkPick }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setRelinkRow(null);
      // The caller may be the uploader — their own essay list caches the
      // snapshot topic too (same reasoning as the staff re-check).
      void useLanguageCheckStore.getState().loadList(true);
      // Refresh the table: the row's Topic column, the topic filter options
      // (they JOIN the live library) and the Topics stat card all change.
      await load();
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setRelinking(false);
    }
  }

  if (!isStaff) {
    return null;
  }

  const rows = data?.rows ?? [];
  const stats = data?.stats;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const hasFilters =
    classId !== "all" || userId !== "all" || status !== "all" || topicId !== "all";

  // Clicking the active column's header flips the direction; clicking
  // another column activates it with its natural default direction.
  function handleSort(field: StaffSortField) {
    if (sort === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder(field === "student" || field === "title" ? "asc" : "desc");
    }
    setPage(1);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={BookMarked}
          label={t("languageCheck.staff.statTopics")}
          value={stats ? stats.topics : "…"}
          tone="text-amber-500"
        />
        <Stat
          icon={PenLine}
          label={t("languageCheck.staff.statEssays")}
          value={stats ? stats.total : "…"}
          tone="text-sky-500"
        />
        <Stat
          icon={Users}
          label={t("languageCheck.staff.statStudents")}
          value={stats ? stats.students : "…"}
          tone="text-indigo-500"
        />
        <Stat
          icon={Trophy}
          label={t("languageCheck.staff.statAvgScore")}
          // "—" when nothing in the filter set has been assessed (never a fake 0).
          value={
            stats ? (stats.avgOverall === null ? "—" : stats.avgOverall.toFixed(1)) : "…"
          }
          hint={t("languageCheck.staff.avgScoreHint")}
          tone="text-green-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TopicCombobox
          topics={data?.topics ?? []}
          value={topicId === "all" ? null : topicId}
          onChange={(id) => {
            setTopicId(id ?? "all");
            setPage(1);
          }}
          ariaLabel={t("languageCheck.staff.filterTopic")}
          placeholder={t("languageCheck.staff.allTopics")}
          allLabel={t("languageCheck.staff.allTopics")}
          emptyLabel={t("languageCheck.staff.noTopics")}
          searchPlaceholder={t("languageCheck.staff.searchTopics")}
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-44" aria-label={t("languageCheck.staff.filterStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("languageCheck.staff.allStatuses")}
            </SelectItem>
            {LANGUAGE_CHECK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`languageCheck.list.status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          {t("languageCheck.staff.refresh")}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {hasFilters
            ? t("languageCheck.staff.emptyFilter")
            : t("languageCheck.staff.empty")}
        </p>
      ) : (
        <>
          <div className={cn("overflow-x-auto rounded-xl border bg-card px-3", loading && "opacity-60")}>
            <table className="w-full min-w-[62rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th
                    className="py-2 pr-3 font-medium"
                    aria-sort={sort === "student" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeader
                      label={t("languageCheck.staff.colStudent")}
                      field="student"
                      sort={sort}
                      order={order}
                      onSort={handleSort}
                    />
                  </th>
                  <th
                    className="py-2 pr-3 font-medium"
                    aria-sort={sort === "title" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeader
                      label={t("languageCheck.staff.colTitle")}
                      field="title"
                      sort={sort}
                      order={order}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colStatus")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colPages")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colWords")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colErrors")}
                  </th>
                  <th
                    className="py-2 pr-3 font-medium"
                    aria-sort={sort === "overall" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeader
                      label={t("languageCheck.assessment.overall")}
                      field="overall"
                      sort={sort}
                      order={order}
                      onSort={handleSort}
                    />
                  </th>
                  <th
                    className="py-2 pr-3 font-medium"
                    aria-sort={sort === "updated" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeader
                      label={t("languageCheck.staff.colUpdated")}
                      field="updated"
                      sort={sort}
                      order={order}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="max-w-[14rem] py-2 pr-3">
                      <span className="block truncate font-medium">
                        {row.userName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.userEmail}
                      </span>
                    </td>
                    <td className="max-w-[12rem] py-2 pr-3">
                      {renamingId === row.id ? (
                        <Input
                          value={renameValue}
                          maxLength={200}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => void commitRename(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            else if (e.key === "Escape") cancelRename();
                          }}
                          aria-label={t("languageCheck.staff.rename")}
                          className="h-8"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="min-w-0 flex-1 truncate">
                            {row.title || t("languageCheck.list.untitled")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            title={t("languageCheck.staff.rename")}
                            aria-label={t("languageCheck.staff.rename")}
                            onClick={() => startRename(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            title={t("languageCheck.staff.relink")}
                            aria-label={t("languageCheck.staff.relink")}
                            onClick={() => void openRelink(row)}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_TONE[row.status],
                        )}
                      >
                        {t(`languageCheck.list.status.${row.status}`)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.pageCount}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.wordCount}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.status === "checked" ? row.errorCount : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.overall ?? "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenId(row.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {t("languageCheck.staff.view")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("languageCheck.list.rowsPerPage")}:
                </span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs transition-colors",
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">
                  {t("languageCheck.staff.page", {
                    page: safePage,
                    total: totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <StaffEssayDialog
        essayId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => void load()}
      />

      {relinkRow && (
        <Dialog open onOpenChange={(o) => !o && setRelinkRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("languageCheck.staff.relinkTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("languageCheck.staff.relinkDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <p className="truncate text-sm">
                <span className="text-muted-foreground">
                  {t("languageCheck.staff.relinkCurrent")}:
                </span>{" "}
                <span className="font-medium">
                  {relinkRow.topicTitle ||
                    (relinkRow.topicId
                      ? t("languageCheck.staff.topicDeleted")
                      : "—")}
                </span>
              </p>
              <TopicCombobox
                topics={libraryTopics ?? []}
                value={relinkPick}
                onChange={setRelinkPick}
                // Keeps the current link readable even when it is dangling
                // (deleted topics are not in the library options).
                customLabel={
                  relinkRow.topicId
                    ? relinkRow.topicTitle ||
                      t("languageCheck.staff.topicDeleted")
                    : undefined
                }
                ariaLabel={t("languageCheck.staff.relinkPick")}
                placeholder={t("languageCheck.staff.relinkPick")}
                // Pinned null-emitting option = unlink (Save then removes
                // the essay's topic link instead of re-pointing it).
                allLabel={t("languageCheck.staff.unlink")}
                emptyLabel={
                  libraryTopics === null
                    ? t("languageCheck.staff.loadingStudents")
                    : t("languageCheck.staff.noTopics")
                }
                searchPlaceholder={t("languageCheck.staff.searchTopics")}
                className="w-full"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRelinkRow(null)}
                >
                  {t("languageCheck.cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={
                    relinking ||
                    // Unlink needs a link to remove; re-link needs a pick
                    // that resolves to a visible library topic.
                    (relinkPick === null
                      ? !relinkRow.topicId
                      : !libraryTopics?.some((tp) => tp.id === relinkPick))
                  }
                  onClick={() => void handleRelink()}
                >
                  {relinking ? (
                    <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-1.5 h-4 w-4" />
                  )}
                  {relinkPick === null
                    ? t("languageCheck.staff.unlink")
                    : t("languageCheck.staff.relinkSave")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </section>
  );
}
