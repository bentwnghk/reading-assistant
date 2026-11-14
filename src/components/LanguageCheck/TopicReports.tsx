"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  School,
  Search,
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
import { Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { parseError } from "@/utils/error";
import { cn } from "@/utils/style";
import { percentOf, percentTone } from "@/utils/languageCheckTopicReport";

type SortKey = "recent" | "completion" | "score" | "title";

interface TopicReportsResponse {
  topics: LanguageCheckTopicReportCard[];
  /**
   * Checked essays in scope (incl. essays with no topic link) — always equal
   * to the Student essays tab's checked count under the same class filter.
   */
  checkedEssays: number;
}

export function topicReportUrl(id: string): string {
  return `/writing-assessment/topic-report?topic=${encodeURIComponent(id)}`;
}

function completionOf(c: LanguageCheckTopicReportCard): number | null {
  return c.studentCount ? c.doneStudents / c.studentCount : null;
}

/**
 * Staff "Topic reports" tab: one card per live topic that at least one
 * in-scope student has written on, showing the class and how many checked
 * essays it has. The stat cards mirror the Student essays tab (same essay
 * set), so Topics / Checked essays tally between the two tabs. Clicking a
 * card opens the full class report page.
 */
export default function TopicReports({ classId }: { classId: string | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<TopicReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    const qs =
      classId === "__mine__"
        ? "?mine=1"
        : classId
          ? `?classId=${encodeURIComponent(classId)}`
          : "";
    void (async () => {
      try {
        const res = await fetch(`/api/writing-assessment/staff/topic-reports${qs}`, {
          signal: ac.signal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setData(body as TopicReportsResponse);
        setLoading(false);
      } catch (error) {
        if (ac.signal.aborted) return;
        toast.error(parseError(error));
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [classId, reloadKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.topics ?? []).filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.className ?? "").toLowerCase().includes(q),
    );
    const by: Record<SortKey, (a: LanguageCheckTopicReportCard, b: LanguageCheckTopicReportCard) => number> = {
      recent: (a, b) => b.updatedAt - a.updatedAt,
      completion: (a, b) => (completionOf(b) ?? -1) - (completionOf(a) ?? -1),
      score: (a, b) =>
        (percentOf(b.avgOverall, b.overallMax) ?? -1) - (percentOf(a.avgOverall, a.overallMax) ?? -1),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...list].sort(by[sort]);
  }, [data, query, sort]);

  // Topics = cards (topics with ≥1 in-scope essay); Checked essays comes
  // from the server (it also counts essays with no topic link, which have
  // no card) so it always equals the Student essays tab's checked count.
  // "Fully checked" stays roster-based: every non-banned class student has
  // a checked essay.
  const totals = useMemo(() => {
    const list = data?.topics ?? [];
    const done = list.filter((c) => c.studentCount && c.doneStudents >= c.studentCount).length;
    return { topics: list.length, checked: data?.checkedEssays ?? 0, done };
  }, [data]);

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={BookMarked}
          label={t("languageCheck.reports.statTopics")}
          value={data ? totals.topics : "…"}
          tone="text-amber-500"
        />
        <Stat
          icon={CheckCircle2}
          label={t("languageCheck.reports.statChecked")}
          value={data ? totals.checked : "…"}
          tone="text-green-500"
        />
        <Stat
          icon={Trophy}
          label={t("languageCheck.reports.statComplete")}
          value={data ? totals.done : "…"}
          hint={t("languageCheck.reports.statCompleteHint")}
          tone="text-indigo-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("languageCheck.reports.search")}
            aria-label={t("languageCheck.reports.search")}
            className="h-9 pl-8"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-48" aria-label={t("languageCheck.reports.sortLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["recent", "completion", "score", "title"] as const).map((k) => (
              <SelectItem key={k} value={k}>
                {t(`languageCheck.reports.sort.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={loading}
          onClick={() => setReloadKey((k) => k + 1)}
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
        <div className="flex justify-center py-10">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {data && data.topics.length > 0
            ? t("languageCheck.reports.emptySearch")
            : t("languageCheck.reports.empty")}
        </p>
      ) : (
        <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-60")}>
          {visible.map((c) => (
            <TopicCard key={c.id} card={c} onOpen={() => router.push(topicReportUrl(c.id))} />
          ))}
        </div>
      )}
    </section>
  );
}

function TopicCard({
  card,
  onOpen,
}: {
  card: LanguageCheckTopicReportCard;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const ratio = completionOf(card);
  const complete = ratio !== null && ratio >= 1;
  const scoreTone = percentTone(percentOf(card.avgOverall, card.overallMax));
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 min-w-0 font-semibold leading-snug">
          {card.title || t("languageCheck.list.untitled")}
        </h3>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="flex min-w-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          <School className="h-3 w-3 shrink-0" />
          <span className="truncate">{card.className ?? t("languageCheck.reports.noClass")}</span>
        </span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300">
          {LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[card.essayType]?.label ?? card.essayType}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {t("languageCheck.reports.checkedLabel")}
          </span>
          {/* Essay rows (matches the essay log filtered to this topic), so a
              retake counts — the roster ratio below is per student. */}
          <span className="font-semibold tabular-nums">{card.checkedCount}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round((ratio ?? 0) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full", complete ? "bg-green-500" : "bg-primary")}
            style={{ width: `${Math.min(100, (ratio ?? (card.checkedCount > 0 ? 1 : 0)) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {ratio !== null
              ? t("languageCheck.reports.rosterDone", {
                  done: card.doneStudents,
                  total: card.studentCount,
                })
              : t("languageCheck.reports.noRoster")}
          </span>
          <span>
            {t("languageCheck.reports.avg")}{" "}
            <span className={cn("font-semibold tabular-nums", scoreTone.text)}>
              {card.avgOverall !== null ? `${card.avgOverall} / ${card.overallMax}` : "—"}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
