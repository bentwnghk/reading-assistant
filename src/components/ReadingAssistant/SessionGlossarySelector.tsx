"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, X, Search, BookOpen, Hash } from "lucide-react";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { mergeGlossariesFromSessions } from "@/utils/vocabulary";
import dayjs from "dayjs";
import Fuse from "fuse.js";

interface SessionGlossarySelectorProps {
  selectedSessionIds: string[];
  onSelectionChange: (ids: string[]) => void;
  currentGlossary: GlossaryEntry[];
  currentRatings: Record<string, GlossaryRating>;
}

const PAGE_SIZE = 10;

function SessionGlossarySelector({
  selectedSessionIds,
  onSelectionChange,
  currentGlossary,
  currentRatings,
}: SessionGlossarySelectorProps) {
  const { t } = useTranslation();
  const { history } = useHistoryStore();
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sessionsWithGlossary = useMemo(() => {
    return history.filter(
      (session) => session.glossary && session.glossary.length > 0
    );
  }, [history]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessionsWithGlossary;
    const fuse = new Fuse(sessionsWithGlossary, {
      keys: ["docTitle", "extractedText"],
      threshold: 0.4,
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [sessionsWithGlossary, searchQuery]);

  const visibleSessions = filteredSessions.slice(0, visibleCount);
  const hasMore = filteredSessions.length > visibleCount;

  const mergedResult = useMemo(() => {
    if (selectedSessionIds.length === 0) {
      return { entries: currentGlossary, ratings: currentRatings, addedCount: 0 };
    }
    return mergeGlossariesFromSessions(currentGlossary, currentRatings, selectedSessionIds, history);
  }, [currentGlossary, currentRatings, selectedSessionIds, history]);

  const toggleSession = useCallback(
    (sessionId: string) => {
      if (selectedSessionIds.includes(sessionId)) {
        onSelectionChange(selectedSessionIds.filter((id) => id !== sessionId));
      } else {
        onSelectionChange([...selectedSessionIds, sessionId]);
      }
    },
    [selectedSessionIds, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const totalUnique = mergedResult.entries.length;
  const currentCount = currentGlossary.length;
  const addedCount = mergedResult.addedCount;

  if (sessionsWithGlossary.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium transition-colors",
          selectedSessionIds.length > 0
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <BookOpen className="h-4 w-4" />
        <span>{t("reading.glossary.addFromHistory")}</span>
        {selectedSessionIds.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
            <Hash className="h-3 w-3" />
            {addedCount} {t("reading.glossary.addedWords")}
          </span>
        )}
      </button>

      {selectedSessionIds.length > 0 && (
        <div className="text-xs text-muted-foreground pl-6">
          {t("reading.glossary.uniqueWordsCount", {
            current: currentCount,
            added: addedCount,
            total: totalUnique,
          })}
        </div>
      )}

      {expanded && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("reading.glossary.selectSessions")}
            </span>
            {selectedSessionIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                {t("reading.glossary.clearSelection")}
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={t("reading.glossary.searchSessions")}
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-3">
              {t("reading.glossary.noSessionsFound")}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {visibleSessions.map((session) => {
                const isSelected = selectedSessionIds.includes(session.id);
                const wordCount = session.glossary?.length || 0;
                const title =
                  session.docTitle ||
                  session.extractedText?.slice(0, 50) ||
                  "Untitled";
                const date = dayjs(
                  session.updatedAt || session.createdAt
                ).format("MM/DD");

                return (
                  <button
                    key={session.id}
                    onClick={() => toggleSession(session.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 truncate">{title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {wordCount} {t("reading.glossary.wordCountUnit")}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {date}
                    </span>
                  </button>
                );
              })}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
                >
                  {t("reading.glossary.loadMore")}
                </button>
              )}
            </div>
          )}

          {selectedSessionIds.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
              <span>
                {t("reading.glossary.selectedSessions", {
                  count: selectedSessionIds.length,
                })}
              </span>
              <span className="text-primary font-medium">
                {t("reading.glossary.uniqueWordsCount", {
                  current: currentCount,
                  added: addedCount,
                  total: totalUnique,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionGlossarySelector;
