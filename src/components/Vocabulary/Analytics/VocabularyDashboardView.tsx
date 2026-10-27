"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlarmClock,
  BookMarked,
  Brain,
  ChevronLeft,
  ChevronRight,
  Layers,
  ListPlus,
  Plus,
  SpellCheck,
  Target,
  Trophy,
  ClipboardList,
  CircleOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/style";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Delta, PercentBadge, Stat } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import AddToReviewListDialog from "@/components/Vocabulary/AddToReviewListDialog";
import type { VocabularyAnalyticsData } from "@/utils/vocabularyAnalyticsWire";

const COLORS = {
  reviewed: "#38bdf8",
  added: "#6366f1",
  accuracy: "#f97316",
};

const LEVEL_COLORS = ["#9ca3af", "#ef4444", "#f97316", "#eab308", "#3b82f6", "#22c55e"];

export const MODE_ICON: Record<"flashcard" | "quiz" | "spelling", LucideIcon> = {
  flashcard: Layers,
  quiz: ClipboardList,
  spelling: SpellCheck,
};

const shortDate = (bucket: string) => bucket.slice(5);

/** Rows of the "most missed words" table visible at once (the server sends
 *  up to 100 and selection spans every page). */
const HARD_WORDS_PAGE_SIZE = 20;

/**
 * Totals, activity over time, mastery distribution, modes and the hardest
 * words. `variant="self"` is the learner's own view: staff-only phrasing and
 * the "students who missed it" column are dropped.
 */
export default function VocabularyDashboardView({
  data,
  variant = "staff",
}: {
  data: VocabularyAnalyticsData;
  variant?: "staff" | "self";
}) {
  const { t, i18n } = useTranslation();
  const { totals, snapshot, modes, series, hardWords, sessionHistory } = data;
  const isSelf = variant === "self";

  // "Most missed words" → new review list, mirroring the main vocabulary
  // table's bulk-selection flow. Ephemeral view state: it resets with the
  // component (tab switch) and is pruned when the data refetches. Selection
  // is keyed by word over the FULL hardWords array (all pages), so "Add to
  // review list" can act on every one of the up-to-100 rows, not just the
  // visible page.
  const [selectedHardWords, setSelectedHardWords] = useState<Set<string>>(new Set());
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [hardPage, setHardPage] = useState(1);

  // Drop selections that fell outside the refetched data (range switch).
  useEffect(() => {
    setSelectedHardWords((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(hardWords.map((w) => w.word));
      const next = new Set([...prev].filter((word) => valid.has(word)));
      return next.size === prev.size ? prev : next;
    });
  }, [hardWords]);

  // Refetched data (range/filter switch) restarts on the first page.
  useEffect(() => {
    setHardPage(1);
  }, [hardWords]);

  if (
    totals.sessions === 0 &&
    totals.wordsAdded === 0 &&
    snapshot.words + snapshot.phrases === 0
  ) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t(isSelf ? "vocabulary.analytics.selfNoData" : "vocabulary.analytics.noData")}
      </p>
    );
  }

  const bankTotal = snapshot.words + snapshot.phrases;
  const masteredPct = bankTotal > 0 ? Math.round((snapshot.mastered / bankTotal) * 100) : null;

  // Words the server could not resolve to a (scope-visible) word-bank row
  // (deleted/hidden since review, or no in-scope student holds them) can
  // never enter a review list: their checkboxes are disabled with a
  // tooltip, and select-all skips them.
  const selectableHardWords = hardWords.filter((w) => w.entryType != null);

  const allHardSelected =
    selectableHardWords.length > 0 &&
    selectableHardWords.every((w) => selectedHardWords.has(w.word));
  const someHardSelected = selectedHardWords.size > 0 && !allHardSelected;

  const toggleHardWord = (word: string) =>
    setSelectedHardWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });

  const toggleAllHardWords = () =>
    setSelectedHardWords(
      allHardSelected ? new Set() : new Set(selectableHardWords.map((w) => w.word))
    );

  // The table shows one page at a time; hardWords itself holds up to 100.
  const hardTotalPages = Math.max(1, Math.ceil(hardWords.length / HARD_WORDS_PAGE_SIZE));
  const safeHardPage = Math.min(hardPage, hardTotalPages);
  const pagedHardWords = hardWords.slice(
    (safeHardPage - 1) * HARD_WORDS_PAGE_SIZE,
    safeHardPage * HARD_WORDS_PAGE_SIZE
  );

  // Definitions arrive with the dashboard payload: the server resolves each
  // hard word against a scope-visible word-bank row (self variant → the
  // learner's own bank). Only selectable rows can be checked, so everything
  // selected lands in the list with its definition fields; the entryType
  // guard narrows the type. Built from the FULL hardWords array — words
  // checked on other pages are included.
  const selectedHardListWords: ReviewListWord[] = hardWords
    .filter((w) => selectedHardWords.has(w.word))
    .flatMap((w) =>
      w.entryType == null
        ? []
        : [
            {
              word: w.word,
              syllabification: w.syllabification ?? "",
              partOfSpeech: w.partOfSpeech ?? "",
              englishDefinition: w.englishDefinition ?? "",
              chineseDefinition: w.chineseDefinition ?? "",
              example: w.example ?? "",
              entryType: w.entryType,
            },
          ]
    );

  const openAddToList = () => {
    if (selectedHardListWords.length === 0) return;
    setAddToListOpen(true);
  };

  const levels = snapshot.levels.map((count, level) => ({
    level: level === 0 ? t("vocabulary.analytics.levelNew") : `L${level}`,
    count,
    fill: LEVEL_COLORS[level],
  }));
  // One point per review session, so the x axis must key on something unique
  // per point: recharts resolves tooltips by axis value, and several sessions
  // sharing one "Oct 25" label would all show the first session of that day.
  const history = sessionHistory.map((p, i) => ({
    ...p,
    idx: i,
    label: new Date(p.at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
  }));
  // Show the date only on a day's first session so same-day points don't repeat it.
  const historyTicks = history.map((p, i) => (i === 0 || p.label !== history[i - 1].label ? p.label : ""));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          icon={BookMarked}
          label={t("vocabulary.analytics.statBank")}
          value={bankTotal}
          hint={t("vocabulary.analytics.statBankHint", {
            words: snapshot.words,
            phrases: snapshot.phrases,
          })}
        />
        <Stat
          icon={Trophy}
          label={t("vocabulary.analytics.statMastered")}
          value={snapshot.mastered}
          hint={masteredPct !== null ? t("vocabulary.analytics.statMasteredHint", { percent: masteredPct }) : undefined}
          tone="text-green-500"
        />
        <Stat
          icon={AlarmClock}
          label={t("vocabulary.analytics.statDue")}
          value={snapshot.due}
          hint={t("vocabulary.analytics.statDueHint", { hard: snapshot.hard })}
          tone="text-orange-500"
        />
        <Stat
          icon={Brain}
          label={t("vocabulary.analytics.statAvgMastery")}
          value={snapshot.avgMastery === null ? "—" : snapshot.avgMastery.toFixed(1)}
          hint={t("vocabulary.analytics.statAvgMasteryHint")}
          tone="text-violet-500"
        />
        <Stat
          icon={Target}
          label={t("vocabulary.analytics.statSessions")}
          value={totals.sessions}
          hint={
            totals.accuracy !== null
              ? t("vocabulary.analytics.statSessionsHint", { percent: totals.accuracy })
              : undefined
          }
          tone="text-indigo-500"
        />
        <Stat
          icon={Layers}
          label={t("vocabulary.analytics.statReviewed")}
          value={totals.wordsReviewed}
          tone="text-sky-500"
        />
        <Stat
          icon={Plus}
          label={t("vocabulary.analytics.statAdded")}
          value={totals.wordsAdded}
          tone="text-emerald-500"
        />
        <Stat
          icon={Activity}
          label={t("vocabulary.analytics.statActiveDays")}
          value={totals.activeDays}
          tone="text-rose-500"
        />
      </div>

      {series.length > 0 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t(`vocabulary.analytics.chartActivity.${data.bucketUnit}`)}
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="count" dataKey="wordsReviewed" name={t("vocabulary.analytics.seriesReviewed")} stackId="a" fill={COLORS.reviewed} />
              <Bar yAxisId="count" dataKey="wordsAdded" name={t("vocabulary.analytics.seriesAdded")} stackId="a" fill={COLORS.added} />
              <Line yAxisId="pct" type="monotone" dataKey="accuracy" name={t("vocabulary.analytics.seriesAccuracy")} stroke={COLORS.accuracy} strokeWidth={2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bankTotal > 0 && (
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              {t("vocabulary.analytics.chartMastery")}
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={levels}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name={t("vocabulary.analytics.entries")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.modesTitle")}
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colMode")}</th>
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colSessions")}</th>
                <th className="py-1.5 pr-2 font-medium">{t("vocabulary.analytics.colReviewed")}</th>
                <th className="py-1.5 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {modes.map((m) => {
                const Icon = MODE_ICON[m.mode];
                return (
                  <tr key={m.mode} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {t(`vocabulary.analytics.mode.${m.mode}`)}
                      </span>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{m.sessions}</td>
                    <td className="py-2 pr-2 tabular-nums">{m.wordsReviewed}</td>
                    <td className="py-2"><PercentBadge value={m.accuracy} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {history.length > 1 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("vocabulary.analytics.chartHistory")}
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="idx" tickFormatter={(v) => historyTicks[Number(v)] ?? ""} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value}%`, t("vocabulary.analytics.sessionAccuracy")]}
                labelFormatter={(_l, payload) => {
                  const p = payload?.[0]?.payload as (typeof history)[number] | undefined;
                  return p ? `${t(`vocabulary.analytics.mode.${p.mode}`)} · ${t("vocabulary.analytics.wordCount", { count: p.total })}` : "";
                }}
              />
              <Line type="monotone" dataKey="accuracy" stroke={COLORS.added} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hardWords.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <div className="flex items-center gap-2 px-3 pt-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {t("vocabulary.analytics.hardWordsTitle")}
            </h4>
            <div className="flex-1" />
            {selectedHardWords.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("vocabulary.selectedCount", { count: selectedHardWords.size })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={selectedHardWords.size === 0}
              onClick={openAddToList}
            >
              <ListPlus className="h-4 w-4 mr-1" />
              {t("vocabulary.reviewLists.addToList")}
            </Button>
          </div>
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-[40px] px-3 py-2">
                  <Checkbox
                    checked={
                      allHardSelected ? true : someHardSelected ? "indeterminate" : false
                    }
                    onCheckedChange={toggleAllHardWords}
                    disabled={selectableHardWords.length === 0}
                    aria-label={t("share.selectAll")}
                  />
                </th>
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colWord")}</th>
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colMissed")}</th>
                {!isSelf && (
                  <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colLearnersMissed")}</th>
                )}
                <th className="px-3 py-2 font-medium">{t("vocabulary.analytics.colAccuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedHardWords.map((w) => {
                const unavailable = w.entryType == null;
                return (
                  <tr
                    key={w.word}
                    className={cn(
                      "border-b last:border-0",
                      selectedHardWords.has(w.word) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2">
                      {unavailable ? (
                        <TooltipProvider>
                          <UITooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              {/* span wrapper: a disabled checkbox swallows
                                  pointer events, the span keeps the tooltip */}
                              <span className="inline-flex">
                                <Checkbox checked={false} disabled aria-label={w.word} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-md:hidden">
                              {t("vocabulary.analytics.hardWordsUnavailable")}
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      ) : (
                        <Checkbox
                          checked={selectedHardWords.has(w.word)}
                          onCheckedChange={() => toggleHardWord(w.word)}
                          aria-label={w.word}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          unavailable && "text-muted-foreground"
                        )}
                      >
                        {unavailable && (
                          <CircleOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                        {w.word}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{w.wrong}/{w.attempts}</td>
                    {!isSelf && <td className="px-3 py-2 tabular-nums">{w.learners}</td>}
                    <td className="px-3 py-2">
                      <PercentBadge value={Math.round(((w.attempts - w.wrong) / w.attempts) * 100)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hardWords.length > HARD_WORDS_PAGE_SIZE && (
            <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safeHardPage <= 1}
                onClick={() => setHardPage(safeHardPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                {t("languageCheck.staff.page", { page: safeHardPage, total: hardTotalPages })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safeHardPage >= hardTotalPages}
                onClick={() => setHardPage(safeHardPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      <AddToReviewListDialog
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        words={selectedHardListWords}
      />
      <p className={cn("text-[11px] text-muted-foreground")}>
        {t(isSelf ? "vocabulary.analytics.selfNote" : "vocabulary.analytics.note")}
      </p>
    </div>
  );
}

export { Delta, PercentBadge };
