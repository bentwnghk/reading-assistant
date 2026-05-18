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
  } = useVocabularyStore();

  const [sortField, setSortField] = useState<SortField>("word");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const hasEverSelected = selectedWordIds.size > 0;
  const effectiveShowSelectedOnly = showSelectedOnly && hasEverSelected;

  const filteredWords = useMemo(() => {
    let result = [...words];

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
  }, [words, searchQuery, filterRating, filterMastery, sortField, sortOrder, effectiveShowSelectedOnly, selectedWordIds]);

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
    filteredWords.length > 0 &&
    filteredWords.every((w) => selectedWordIds.has(w.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      const idsToRemove = new Set(filteredWords.map((w) => w.id));
      const next = new Set(
        [...selectedWordIds].filter((id) => !idsToRemove.has(id))
      );
      useVocabularyStore.getState().setSelectedWordIds(next);
    } else {
      const next = new Set([
        ...selectedWordIds,
        ...filteredWords.map((w) => w.id),
      ]);
      useVocabularyStore.getState().setSelectedWordIds(next);
    }
  }, [allSelected, filteredWords, selectedWordIds]);

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

  const hasActiveFilters = filterRating !== "all" || filterMastery !== "all" || searchQuery !== "";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("vocabulary.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterRating("all");
                setFilterMastery("all");
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
              className="h-9 animate-pulse ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
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

      <div className="text-xs text-muted-foreground mb-2">
        {t("vocabulary.showingWords", { count: filteredWords.length, total: words.length })}
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
            {filteredWords.map((w) => (
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
            {filteredWords.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t("vocabulary.noWordsMatch")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default VocabularyTable;
