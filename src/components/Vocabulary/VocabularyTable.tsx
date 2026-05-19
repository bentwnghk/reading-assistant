"use client";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Search,
  Filter,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ListChecks,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useVocabularyStore } from "@/store/vocabulary";
import { getMasteryColor, isDueForReview } from "@/utils/srs";
import { cn } from "@/utils/style";

type SortField =
  | "word"
  | "rating"
  | "mastery"
  | "lastReviewed"
  | "createdAt";
type SortOrder = "asc" | "desc";

const RATING_SORT: Record<string, number> = { hard: 3, medium: 2, easy: 1 };

function VocabularyTable() {
  const { t } = useTranslation();
  const {
    words,
    selectedWordIds,
    toggleWordSelection,
    searchQuery,
    setSearchQuery,
    filterRating,
    setFilterRating,
    filterMastery,
    setFilterMastery,
    filterSource,
    setFilterSource,
    activeReviewListWordIds,
    exitReviewList,
  } = useVocabularyStore();

  const [sortField, setSortField] = useState<SortField>("word");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const hasEverSelected = selectedWordIds.size > 0;
  const effectiveShowSelectedOnly = showSelectedOnly && hasEverSelected;

  const filteredWords = useMemo(() => {
    let result = activeReviewListWordIds
      ? words.filter((w) => activeReviewListWordIds.has(w.id))
      : [...words];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.englishDefinition.toLowerCase().includes(q) ||
          w.chineseDefinition.includes(searchQuery) ||
          w.partOfSpeech.toLowerCase().includes(q)
      );
    }

    if (filterRating !== "all") {
      result = result.filter((w) => w.rating === filterRating);
    }

    if (filterMastery === "due") {
      result = result.filter(isDueForReview);
    } else if (filterMastery === "new") {
      result = result.filter((w) => w.masteryLevel === 0 && w.reviewCount === 0);
    } else if (filterMastery === "mastered") {
      result = result.filter((w) => w.masteryLevel === 5);
    }

    if (filterSource !== "all") {
      result = result.filter((w) => w.source === filterSource);
    }

    if (effectiveShowSelectedOnly) {
      result = result.filter((w) => selectedWordIds.has(w.id));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "word":
          cmp = a.word.localeCompare(b.word);
          break;
        case "rating":
          cmp = (RATING_SORT[a.rating || ""] || 0) - (RATING_SORT[b.rating || ""] || 0);
          break;
        case "mastery":
          cmp = a.masteryLevel - b.masteryLevel;
          break;
        case "lastReviewed":
          cmp = a.lastReviewedAt - b.lastReviewedAt;
          break;
        case "createdAt":
          cmp = a.createdAt - b.createdAt;
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [words, searchQuery, filterRating, filterMastery, filterSource, sortField, sortOrder, effectiveShowSelectedOnly, selectedWordIds, activeReviewListWordIds]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedWords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, safePage, pageSize]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortOrder("asc");
      }
    },
    [sortField]
  );

  const allSelected =
    pagedWords.length > 0 &&
    pagedWords.every((w) => selectedWordIds.has(w.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      const idsToRemove = new Set(pagedWords.map((w) => w.id));
      const next = new Set(
        [...selectedWordIds].filter((id) => !idsToRemove.has(id))
      );
      useVocabularyStore.getState().setSelectedWordIds(next);
    } else {
      const next = new Set([
        ...selectedWordIds,
        ...pagedWords.map((w) => w.id),
      ]);
      useVocabularyStore.getState().setSelectedWordIds(next);
    }
  }, [allSelected, pagedWords, selectedWordIds]);

  const getRatingLabel = (rating: GlossaryRating | null) => {
    if (!rating) return "-";
    const key = `vocabulary.ratings.${rating}`;
    return t(key);
  };

  const getRatingDot = (rating: GlossaryRating | null) => {
    if (!rating) return <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />;
    const colors: Record<string, string> = {
      hard: "bg-red-500",
      medium: "bg-yellow-500",
      easy: "bg-green-500",
    };
    return (
      <span className={cn("w-2 h-2 rounded-full inline-block", colors[rating])} />
    );
  };

  const hasActiveFilters = filterRating !== "all" || filterMastery !== "all" || filterSource !== "all" || searchQuery !== "";

  return (
    <div>
      {activeReviewListWordIds && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <ListChecks className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {t("vocabulary.reviewLists.viewingList", { count: activeReviewListWordIds.size })}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={exitReviewList}
          >
            {t("vocabulary.reviewLists.backToMyVocab")}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("vocabulary.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={filterRating !== "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const ratings: Array<GlossaryRating | "all"> = ["all", "hard", "medium", "easy"];
              const idx = ratings.indexOf(filterRating);
              setFilterRating(ratings[(idx + 1) % ratings.length]);
              resetPage();
            }}
            className="h-9"
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            {filterRating === "all"
              ? t("vocabulary.allRatings")
              : filterRating === "hard"
                ? t("vocabulary.hardOnly")
                : filterRating === "medium"
                  ? t("vocabulary.mediumOnly")
                  : t("vocabulary.easyOnly")}
          </Button>
          <Button
            variant={filterMastery !== "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const options: Array<"all" | "due" | "new" | "mastered"> = [
                "all",
                "due",
                "new",
                "mastered",
              ];
              const idx = options.indexOf(filterMastery);
              setFilterMastery(options[(idx + 1) % options.length]);
              resetPage();
            }}
            className="h-9"
          >
            {filterMastery === "all"
              ? t("vocabulary.allLevels")
              : filterMastery === "due"
                ? t("vocabulary.dueOnly")
                : filterMastery === "new"
                  ? t("vocabulary.newOnly")
                  : t("vocabulary.masteredOnly")}
          </Button>
          <Button
            variant={filterSource !== "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const options: Array<"all" | "own" | "teacher"> = ["all", "own", "teacher"];
              const idx = options.indexOf(filterSource);
              setFilterSource(options[(idx + 1) % options.length]);
              resetPage();
            }}
            className="h-9"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {filterSource === "all"
              ? t("vocabulary.allSources")
              : filterSource === "own"
                ? t("vocabulary.ownOnly")
                : t("vocabulary.teacherOnly")}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterRating("all");
                setFilterMastery("all");
                setFilterSource("all");
                resetPage();
              }}
              className="h-9"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t("vocabulary.clearFilters")}
            </Button>
          )}
          {hasEverSelected && !effectiveShowSelectedOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSelectedOnly(true)}
              className="h-9 animate-pulse ring-2 ring-sky-400 dark:ring-sky-300 ring-offset-1 ring-offset-background shadow-[0_0_8px_1px_rgba(56,189,248,0.5)] dark:shadow-[0_0_8px_1px_rgba(125,211,252,0.6)]"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              {t("vocabulary.showSelected")}
            </Button>
          )}
          {hasEverSelected && effectiveShowSelectedOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSelectedOnly(false)}
              className="h-9"
            >
              <EyeOff className="h-3.5 w-3.5 mr-1" />
              {t("vocabulary.showAll")}
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
          <span>
            {activeReviewListWordIds
              ? t("vocabulary.reviewLists.listWords", { count: filteredWords.length })
              : t("vocabulary.showingWords", { count: filteredWords.length, total: words.length })
            }
          </span>
        <span>
          {t("vocabulary.pageInfo", { page: safePage, total: totalPages })}
        </span>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("word")}
                  className="-ml-3"
                >
                  {t("vocabulary.word")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px]">
                {t("vocabulary.syllabification")}
              </TableHead>
              <TableHead className="w-[70px]">
                {t("vocabulary.partOfSpeech")}
              </TableHead>
              <TableHead>{t("vocabulary.englishDefinition")}</TableHead>
              <TableHead className="w-[180px]">
                {t("vocabulary.chineseDefinition")}
              </TableHead>
              <TableHead>{t("vocabulary.example")}</TableHead>
              <TableHead className="w-[80px]">
                {t("vocabulary.source")}
              </TableHead>
              <TableHead className="w-[80px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("rating")}
                  className="-ml-3"
                >
                  {t("vocabulary.rating")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[60px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("mastery")}
                  className="-ml-3"
                >
                  {t("vocabulary.mastery")}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedWords.map((w) => (
              <TableRow
                key={w.id}
                className={cn(
                  selectedWordIds.has(w.id) && "bg-primary/5"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedWordIds.has(w.id)}
                    onCheckedChange={() => toggleWordSelection(w.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{w.word}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {w.syllabification || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground italic text-xs">
                  {w.partOfSpeech || "-"}
                </TableCell>
                <TableCell>{w.englishDefinition}</TableCell>
                <TableCell className="font-noto-sans-tc">
                  {w.chineseDefinition}
                </TableCell>
                <TableCell className="text-muted-foreground italic">
                  {w.example || "-"}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                    w.source === "teacher"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {t(`vocabulary.sourceLabels.${w.source}`)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {getRatingDot(w.rating)}
                    <span className="text-xs text-muted-foreground">
                      {getRatingLabel(w.rating)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                      getMasteryColor(w.masteryLevel)
                    )}
                  >
                    {t(`vocabulary.masteryLevels.${w.masteryLevel}`)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {pagedWords.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {t("vocabulary.noWordsMatch")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredWords.length > pageSize && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("vocabulary.rowsPerPage")}:
            </span>
            {[25, 50, 75, 100].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded transition-colors",
                  pageSize === size
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
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
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - safePage) <= 1;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
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
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      "h-7 w-7 text-xs rounded transition-colors",
                      safePage === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabularyTable;
