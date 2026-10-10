"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  STATUS_TONE,
  categoryStyle,
  explanationFor,
  useCategoryLabel,
  DiffChips,
} from "@/components/LanguageCheck/shared";
import { useLanguageCheckStore } from "@/store/languageCheck";
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
  users: LanguageCheckStaffUser[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Staff-only essay log shown under "Your essays" on /language-check.
 * Renders nothing for students. Teachers see their classes' students,
 * admins their school, super-admins everyone.
 */
export default function StaffEssayLog() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const categoryLabel = useCategoryLabel();
  const language = useLanguageCheckStore((s) => s.explanationLanguage);
  const role = session?.user?.role;

  const [data, setData] = useState<StaffListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userId, setUserId] = useState("all");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<LanguageCheckStaffDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (userId !== "all") params.set("userId", userId);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/language-check/staff?${params.toString()}`);
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
  }, [page, pageSize, userId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setDetailLoadingId(id);
    try {
      const res = await fetch(`/api/language-check/staff/${id}`);
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

  if (role !== "teacher" && role !== "admin" && role !== "super-admin") {
    return null;
  }

  const scopeLabel =
    role === "teacher"
      ? t("languageCheck.staff.scopeTeacher")
      : role === "admin"
        ? t("languageCheck.staff.scopeSchool")
        : t("languageCheck.staff.scopeAll");

  const rows = data?.rows ?? [];
  const stats = data?.stats;
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const hasFilters = userId !== "all" || status !== "all";

  const statCards: { label: string; value: number | undefined }[] = [
    { label: t("languageCheck.staff.statEssays"), value: stats?.total },
    { label: t("languageCheck.staff.statChecked"), value: stats?.checked },
    { label: t("languageCheck.staff.statStudents"), value: stats?.students },
    { label: t("languageCheck.staff.statPages"), value: stats?.pages },
  ];

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold">
          {t("languageCheck.staff.title")}
        </h2>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {scopeLabel}
        </span>
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

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-lg font-semibold leading-tight">
              {card.value ?? "…"}
            </p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={userId}
          onValueChange={(v) => {
            setUserId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-56" aria-label={t("languageCheck.staff.filterStudent")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("languageCheck.staff.allStudents")}
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          {hasFilters
            ? t("languageCheck.staff.emptyFilter")
            : t("languageCheck.staff.empty")}
        </p>
      ) : (
        <>
          <div className={cn("overflow-x-auto", loading && "opacity-60")}>
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colStudent")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colTitle")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colStatus")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colPages")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colErrors")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colUpdated")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("languageCheck.staff.colExpires")}
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
                    <td className="max-w-[12rem] truncate py-2 pr-3">
                      {row.title || t("languageCheck.list.untitled")}
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
                    <td className="py-2 pr-3 tabular-nums">
                      {row.status === "checked" ? row.errorCount : "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                      {formatDateTime(
                        row.createdAt +
                          LANGUAGE_CHECK_RETENTION_DAYS * 86_400_000,
                      )}
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
        <DialogContent className="max-h-[85vh] max-w-[min(95vw,48rem)] overflow-y-auto">
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
                {detail.status === "checked" &&
                  ` · ${t("languageCheck.list.errors", { count: detail.errorCount })}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {detail && (
            <div className="flex flex-col gap-4">
              {detail.corrections.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">
                    {t("languageCheck.staff.detailCorrections")}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {detail.corrections.map((error, index) => (
                      <li
                        key={error.id}
                        className={cn(
                          "rounded-lg border border-l-4 bg-muted/30 p-3",
                          categoryStyle(error.category).border,
                        )}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] font-medium text-white",
                              categoryStyle(error.category).badge,
                            )}
                          >
                            {index + 1}. {categoryLabel(error.category)}
                          </span>
                        </div>
                        <DiffChips
                          original={error.original}
                          correction={error.correction}
                        />
                        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                          {explanationFor(error, language)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {t("languageCheck.staff.detailNoCorrections")}
                </p>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">
                  {t("languageCheck.staff.detailTranscript")}
                </p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
                  {detail.transcript || detail.checkedText || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
