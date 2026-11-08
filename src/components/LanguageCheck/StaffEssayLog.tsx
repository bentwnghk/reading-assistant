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
  Download,
  Eye,
  LoaderCircle,
  PenLine,
  Pencil,
  RefreshCw,
  Square,
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
import ResultsView from "@/components/LanguageCheck/ResultsView";
import AssessmentPanel from "@/components/LanguageCheck/AssessmentPanel";
import EnhancedEssayPanel from "@/components/LanguageCheck/EnhancedEssayPanel";
import ExportDialog from "@/components/LanguageCheck/ExportDialog";
import TopicCombobox from "@/components/LanguageCheck/TopicCombobox";
import { Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import {
  ExplanationLanguageToggle,
  SegmentedTabs,
  STATUS_TONE,
} from "@/components/LanguageCheck/shared";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  abortLanguageCheck,
  useLanguageCheckStore,
} from "@/store/languageCheck";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { parseError } from "@/utils/error";
import {
  LANGUAGE_CHECK_RETENTION_DAYS,
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
  const { runStaffCheck } = useLanguageCheck();
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const setLanguage = useLanguageCheckStore((s) => s.setExplanationLanguage);
  const generating = useLanguageCheckStore((s) => s.activeGenerations);
  const generatingId = useLanguageCheckStore((s) => s.generatingEssayId);
  const role = session?.user?.role;

  const [data, setData] = useState<StaffListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState<"assessment" | "corrections" | "enhanced">(
    "assessment",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const classId = classProp ?? "all";
  const userId = userProp ?? "all";
  const [status, setStatus] = useState("all");
  const [topicId, setTopicId] = useState("all");
  const [sort, setSort] = useState<StaffSortField>("updated");
  const [order, setOrder] = useState<StaffSortOrder>("desc");
  const [detail, setDetail] = useState<LanguageCheckStaffDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // Inline title rename (staff-only affordance in the Title column). The
  // refs make commit idempotent across Enter→blur double fires and keep a
  // cancelled edit from persisting after the input unmounts.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const activeRenameRef = useRef<string | null>(null);
  const renameCancelledRef = useRef(false);

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

  async function openDetail(id: string) {
    setDetailLoadingId(id);
    try {
      const res = await fetch(`/api/writing-assessment/staff/${id}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setDetail(body as LanguageCheckStaffDetail);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setDetailLoadingId(null);
    }
  }

  // Re-check the open student's essay. The generation pipeline (toasts,
  // progress, abort, the one-at-a-time guard) is shared with the owner
  // workspace; only the persist step goes through the staff endpoint.
  const checkRunning =
    !!detail && generatingId === detail.id && !!generating["language-check"];

  async function handleStaffRecheck() {
    if (!detail) return;
    const ok = await runStaffCheck({
      id: detail.id,
      transcript: detail.transcript,
      title: detail.title,
      topic: detail.topic,
      essayType: detail.essayType,
      questionImage: detail.questionImage,
    });
    if (!ok) return;
    setDetailTab("assessment");
    // Refresh the dialog, this table — and the caller's own essay list in
    // the languageCheck store (they may be the uploader of this essay, in
    // which case its summary is cached there too).
    void useLanguageCheckStore.getState().loadList(true);
    await Promise.all([openDetail(detail.id), load()]);
  }

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
      setDetail((d) => (d && d.id === row.id ? { ...d, title: next } : d));
      // The caller may be the uploader — their own essay list caches the
      // title too (same reasoning as the staff re-check).
      void useLanguageCheckStore.getState().loadList(true);
    } catch (error) {
      toast.error(parseError(error));
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

  // Re-check availability — same archive semantics as the owner workspace:
  // past the retention window the essay stays viewable but stops mutating,
  // and without a transcript there is nothing to check.
  const detailExpired =
    !!detail &&
    Date.now() - detail.createdAt >=
      LANGUAGE_CHECK_RETENTION_DAYS * 86_400_000;
  const hasTranscript = !!detail?.transcript.trim();
  const recheckDisabled =
    checkRunning ||
    !!generating["language-check"] ||
    !hasTranscript ||
    detailExpired;
  const recheckTitle = !hasTranscript
    ? t("languageCheck.check.noText")
    : detailExpired
      ? t("languageCheck.results.expiredDisabled")
      : undefined;

  // Map the staff detail onto the essay shape shared by the results view and
  // the Word export (the export reads checkedText/corrections/assessment/
  // enhanced plus the owner block — scans are never sent to staff).
  const detailEssay: LanguageCheckEssay | null = detail
    ? {
        ...detail,
        ownerId: detail.userId,
        ownerName: detail.userName,
        ownerEmail: detail.userEmail,
        images: [],
      }
    : null;
  const detailHasResults =
    detail?.status === "checked" && detail.checkedText.length > 0;

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
          hint={t("languageCheck.assessment.overallScale")}
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
                        disabled={detailLoadingId === row.id}
                        onClick={() => void openDetail(row.id)}
                      >
                        {detailLoadingId === row.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="mr-1 h-4 w-4" />
                            {t("languageCheck.staff.view")}
                          </>
                        )}
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="h-[92vh] max-w-[min(95vw,72rem)] grid-rows-[auto_minmax(0,1fr)]">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {detail?.title || t("languageCheck.list.untitled")}
              {detail && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_TONE[detail.status],
                  )}
                >
                  {t(`languageCheck.list.status.${detail.status}`)}
                </span>
              )}
            </DialogTitle>
            {detail && (
              <DialogDescription>
                {detail.userName} · {detail.userEmail} ·{" "}
                {t("languageCheck.list.pages", { count: detail.pageCount })}
                {detail.wordCount > 0 &&
                  ` · ${t("languageCheck.list.words", { count: detail.wordCount })}`}
                {detail.status === "checked" &&
                  ` · ${t("languageCheck.list.errors", { count: detail.errorCount })}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {detail && (
            <div className="flex min-h-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(detail.createdAt)}
                  {detail.checkModel &&
                    ` · ${t("languageCheck.results.checkedWith", { model: detail.checkModel })}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {checkRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abortLanguageCheck("language-check")}
                    >
                      <Square className="mr-1.5 h-3.5 w-3.5" />
                      {t("languageCheck.stop")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={recheckDisabled}
                    title={recheckTitle}
                    onClick={() => void handleStaffRecheck()}
                  >
                    {checkRunning ? (
                      <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                    )}
                    {detail.status === "checked"
                      ? t("languageCheck.results.recheck")
                      : t("languageCheck.review.runCheck")}
                  </Button>
                  {detailHasResults && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportOpen(true)}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      {t("languageCheck.results.export")}
                    </Button>
                  )}
                  <ExplanationLanguageToggle
                    language={language}
                    onChange={setLanguage}
                  />
                </div>
              </div>

              {detail.status === "checked" && detail.checkedText ? (
                <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
                  <SegmentedTabs
                    value={detailTab}
                    onChange={setDetailTab}
                    ariaLabel={t("languageCheck.results.tabsLabel")}
                    className="w-fit"
                    options={[
                      { value: "assessment", label: t("languageCheck.results.tabAssessment") },
                      { value: "corrections", label: t("languageCheck.results.tabCorrections") },
                      { value: "enhanced", label: t("languageCheck.results.tabEnhanced") },
                    ]}
                  />
                  {detailTab === "assessment" ? (
                    <AssessmentPanel
                      essay={detail}
                      language={language}
                      onSave={async (assessment) => {
                        const res = await fetch(
                          `/api/writing-assessment/staff/${detail.id}/assessment`,
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(assessment),
                          },
                        );
                        if (!res.ok) throw new Error("save failed");
                        setDetail((d) =>
                          d && d.id === detail.id ? { ...d, assessment } : d,
                        );
                      }}
                    />
                  ) : detailTab === "enhanced" ? (
                    <EnhancedEssayPanel
                      essay={detail}
                      onSave={async (enhanced) => {
                        const res = await fetch(
                          `/api/writing-assessment/staff/${detail.id}/enhanced`,
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(enhanced),
                          },
                        );
                        if (!res.ok) throw new Error("save failed");
                        setDetail((d) =>
                          d && d.id === detail.id ? { ...d, enhanced } : d,
                        );
                      }}
                    />
                  ) : detailEssay ? (
                    // Same view students see (ResultsView never reads `images`).
                    <ResultsView essay={detailEssay} language={language} embedded />
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                  <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {t("languageCheck.staff.detailNoCorrections")}
                  </p>
                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      {t("languageCheck.staff.detailTranscript")}
                    </p>
                    <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
                      {detail.transcript || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {exportOpen && detailEssay && (
        <ExportDialog
          essay={detailEssay}
          language={language}
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      )}
    </section>
  );
}
