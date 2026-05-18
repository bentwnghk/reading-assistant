"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookMarked,
  Table,
  Layers,
  ClipboardList,
  SpellCheck,
  LoaderCircle,
  BookOpen,
  Brain,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useVocabularyStore } from "@/store/vocabulary";
import { cn } from "@/utils/style";
import VocabularyTable from "./VocabularyTable";
import AutoSelectPanel from "./AutoSelectPanel";

type TabType = "table" | "flashcard" | "quiz" | "spelling";

const VocabularyFlashcard = dynamic(
  () => import("@/components/ReadingAssistant/VocabularyFlashcard")
);
const VocabularyQuiz = dynamic(
  () => import("@/components/ReadingAssistant/VocabularyQuiz")
);
const VocabularySpelling = dynamic(
  () => import("@/components/ReadingAssistant/VocabularySpelling")
);

function VocabularyContainer() {
  const { t } = useTranslation();
  const {
    words,
    stats,
    reviewQueue,
    selectedWordIds,
    fetchVocabulary,
    startReview,
    clearSelection,
  } = useVocabularyStore();
  const [activeTab, setActiveTab] = useState<TabType>("table");

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  const reviewGlossary = useMemo(() => {
    if (reviewQueue.length > 0) {
      return reviewQueue.map((w) => ({
        word: w.word,
        syllabification: w.syllabification || undefined,
        partOfSpeech: w.partOfSpeech,
        englishDefinition: w.englishDefinition,
        chineseDefinition: w.chineseDefinition,
        example: w.example || undefined,
      }));
    }
    return words
      .filter((w) => selectedWordIds.has(w.id))
      .map((w) => ({
        word: w.word,
        syllabification: w.syllabification || undefined,
        partOfSpeech: w.partOfSpeech,
        englishDefinition: w.englishDefinition,
        chineseDefinition: w.chineseDefinition,
        example: w.example || undefined,
      }));
  }, [reviewQueue, words, selectedWordIds]);

  const reviewRatings = useMemo(() => {
    const sourceWords =
      reviewQueue.length > 0
        ? reviewQueue
        : words.filter((w) => selectedWordIds.has(w.id));
    const ratings: Record<string, GlossaryRating> = {};
    for (const w of sourceWords) {
      if (w.rating) ratings[w.word] = w.rating;
    }
    return ratings;
  }, [reviewQueue, words, selectedWordIds]);

  const handleStartReview = useCallback(() => {
    startReview();
    setActiveTab("flashcard");
  }, [startReview]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab !== "table" && selectedWordIds.size === 0 && reviewQueue.length === 0) {
        return;
      }
      setActiveTab(tab);
    },
    [selectedWordIds, reviewQueue]
  );

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "table", label: t("vocabulary.tabTable"), icon: <Table className="h-4 w-4" /> },
    { key: "flashcard", label: t("vocabulary.tabFlashcard"), icon: <Layers className="h-4 w-4" /> },
    { key: "spelling", label: t("vocabulary.tabSpelling"), icon: <SpellCheck className="h-4 w-4" /> },
    { key: "quiz", label: t("vocabulary.tabQuiz"), icon: <ClipboardList className="h-4 w-4" /> },
  ];

  const isLoading = useVocabularyStore((s) => s.isLoading);

  const handleWordAction = useCallback(
    (word: string, action: "again" | "hard" | "good" | "easy") => {
      const store = useVocabularyStore.getState();
      if (action === "again" || action === "hard") {
        store.updateWordRating(word, "hard");
        store.updateWordReview(word, false);
      } else if (action === "good") {
        store.updateWordReview(word, true);
      } else if (action === "easy") {
        store.updateWordRating(word, "easy");
        store.updateWordReview(word, true);
      }
    },
    []
  );

  const handleWordResult = useCallback((word: string, correct: boolean) => {
    const store = useVocabularyStore.getState();
    store.updateWordReview(word, correct);
  }, []);

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-500" />
            {t("vocabulary.title")}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-medium mb-2">
            {t("vocabulary.emptyTitle")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("vocabulary.emptyDesc")}
          </p>
          <Link href="/">
            <Button>{t("vocabulary.startReading")}</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <BookMarked className="h-4 w-4" />
                {t("vocabulary.stats.total")}
              </div>
              <div className="text-2xl font-bold">{stats.totalWords}</div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4 text-orange-500" />
                {t("vocabulary.stats.due")}
              </div>
              <div className="text-2xl font-bold text-orange-500">
                {stats.dueForReview}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("vocabulary.stats.mastered")}
              </div>
              <div className="text-2xl font-bold text-green-500">
                {stats.mastered}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Brain className="h-4 w-4 text-blue-500" />
                {t("vocabulary.stats.new")}
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {stats.newWords}
              </div>
            </div>
          </div>

          {activeTab === "table" && (
            <>
              <AutoSelectPanel />
              {selectedWordIds.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="text-sm font-medium">
                    {t("vocabulary.selectedCount", {
                      count: selectedWordIds.size,
                    })}
                  </span>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    {t("vocabulary.clearSelection")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStartReview}
                    className="shadow-[0_0_10px_2px_rgba(56,189,248,0.5)] dark:shadow-[0_0_10px_2px_rgba(125,211,252,0.6)] hover:shadow-[0_0_14px_4px_rgba(56,189,248,0.6)] dark:hover:shadow-[0_0_14px_4px_rgba(125,211,252,0.7)]"
                  >
                    {t("vocabulary.startReview")}
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex gap-1 mb-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                disabled={
                  tab.key !== "table" &&
                  selectedWordIds.size === 0 &&
                  reviewQueue.length === 0
                }
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  tab.key !== "table" &&
                    selectedWordIds.size === 0 &&
                    reviewQueue.length === 0 &&
                    "opacity-40 cursor-not-allowed"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "table" && <VocabularyTable />}
          {activeTab === "flashcard" && (
            <VocabularyFlashcard
              glossary={reviewGlossary}
              mergedRatings={reviewRatings}
              onWordAction={handleWordAction}
            />
          )}
          {activeTab === "quiz" && (
            <VocabularyQuiz
              glossary={reviewGlossary}
              mergedRatings={reviewRatings}
              onWordResult={handleWordResult}
            />
          )}
          {activeTab === "spelling" && (
            <VocabularySpelling
              glossary={reviewGlossary}
              mergedRatings={reviewRatings}
              onWordResult={handleWordResult}
            />
          )}
        </>
      )}
    </div>
  );
}

export default VocabularyContainer;
