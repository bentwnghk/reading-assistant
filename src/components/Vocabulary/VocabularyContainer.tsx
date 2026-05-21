"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
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
  History,
  Share2,
  ListPlus,
  HelpCircle,
  Sparkles,
  Zap,
  FileDown,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVocabularyStore } from "@/store/vocabulary";
import { cn } from "@/utils/style";
import VocabularyTable from "./VocabularyTable";
import AutoSelectPanel from "./AutoSelectPanel";
import ExportPanel from "./ExportPanel";
import ShareVocabularyDialog from "./ShareVocabularyDialog";
import AddToReviewListDialog from "./AddToReviewListDialog";
import ReviewListsTab from "./ReviewListsTab";
import ReviewListShareDialog from "./ReviewListShareDialog";

type TabType = "table" | "flashcard" | "quiz" | "spelling" | "lists" | "history";

const VocabularyFlashcard = dynamic(
  () => import("@/components/ReadingAssistant/VocabularyFlashcard")
);
const VocabularyQuiz = dynamic(
  () => import("@/components/ReadingAssistant/VocabularyQuiz")
);
const VocabularySpelling = dynamic(
  () => import("@/components/ReadingAssistant/VocabularySpelling")
);
const ReviewHistory = dynamic(() => import("./ReviewHistory"));

const toEntry = (w: { word: string; syllabification?: string; partOfSpeech: string; englishDefinition: string; chineseDefinition: string; example?: string }): GlossaryEntry => ({
  word: w.word,
  syllabification: w.syllabification || undefined,
  partOfSpeech: w.partOfSpeech,
  englishDefinition: w.englishDefinition,
  chineseDefinition: w.chineseDefinition,
  example: w.example || undefined,
});

function VocabularyContainer() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isTeacherOrAbove =
    session?.user?.role === "teacher" ||
    session?.user?.role === "admin" ||
    session?.user?.role === "super-admin";
  const {
    words,
    stats,
    reviewQueue,
    selectedWordIds,
    fetchVocabulary,
    startReview,
    clearSelection,
    loadReviewListIntoQueue,
    acceptedReviewListWords,
    setAcceptedReviewListWords,
  } = useVocabularyStore();
  const [activeTab, setActiveTab] = useState<TabType>("table");
  const [shareOpen, setShareOpen] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<"overview" | "review" | "extras">("overview");
  const currentReviewMode = useRef<VocabularyReviewMode>("flashcard");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  useEffect(() => {
    if (!acceptedReviewListWords || acceptedReviewListWords.length === 0) return;
    if (useVocabularyStore.getState().isLoading) return;
    const w = acceptedReviewListWords;
    setAcceptedReviewListWords(null);
    loadReviewListIntoQueue(w);
    setActiveTab("table");
  }, [acceptedReviewListWords, words, loadReviewListIntoQueue, setAcceptedReviewListWords]);

  useEffect(() => {
    if (searchParams.get("openReviewListShare") === "1") {
      useVocabularyStore.getState().setShowReviewListShareDialog(true);
      router.replace("/vocabulary", { scroll: false });
    }
  }, [searchParams, router]);

  const reviewQueueGlossary = useMemo(() => reviewQueue.map(toEntry), [reviewQueue]);

  const selectedWordsGlossary = useMemo(
    () => words.filter((w) => selectedWordIds.has(w.id)).map(toEntry),
    [words, selectedWordIds]
  );

  const reviewGlossary = reviewQueue.length > 0 ? reviewQueueGlossary : selectedWordsGlossary;

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
    currentReviewMode.current = "flashcard";
    setActiveTab("flashcard");
  }, [startReview]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab === "history" || tab === "lists") {
        setActiveTab(tab);
        return;
      }
      if (tab !== "table" && selectedWordIds.size === 0 && reviewQueue.length === 0) {
        return;
      }
      if (tab === "flashcard" || tab === "quiz" || tab === "spelling") {
        currentReviewMode.current = tab;
      }
      setActiveTab(tab);
    },
    [selectedWordIds, reviewQueue]
  );

  const handleReviewComplete = useCallback(
    (results: { word: string; correct: boolean; rating?: SRSAction; attempts?: number }[], ratingCounts?: VocabularyRatingCounts) => {
      if (results.length === 0) return;
      const store = useVocabularyStore.getState();
      const reviewResults: VocabularyReviewResult[] = results.map((r) => {
        const w = store.words.find(
          (vw) => vw.word.toLowerCase() === r.word.toLowerCase()
        );
        return {
          word: r.word,
          correct: r.correct,
          masteryBefore: w?.masteryLevel ?? 0,
          masteryAfter: w?.masteryLevel ?? 0,
          rating: r.rating,
          attempts: r.attempts,
        };
      });
      fetch("/api/vocabulary/review-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: currentReviewMode.current,
          results: reviewResults,
          ratingCounts,
        }),
      }).catch((err) => console.error("Failed to save review session:", err));
    },
    [],
  );

  const handleReviewList = useCallback(
    async (listId: string) => {
      try {
        const res = await fetch(`/api/review-lists/${listId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.words?.length > 0) {
          loadReviewListIntoQueue(data.words);
          setActiveTab("table");
        }
      } catch (err) {
        console.error("Failed to load review list:", err);
      }
    },
    [loadReviewListIntoQueue]
  );

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "table", label: t("vocabulary.tabTable"), icon: <Table className="h-4 w-4" /> },
    { key: "flashcard", label: t("vocabulary.tabFlashcard"), icon: <Layers className="h-4 w-4" /> },
    { key: "spelling", label: t("vocabulary.tabSpelling"), icon: <SpellCheck className="h-4 w-4" /> },
    { key: "quiz", label: t("vocabulary.tabQuiz"), icon: <ClipboardList className="h-4 w-4" /> },
    { key: "lists", label: t("vocabulary.tabLists"), icon: <ListPlus className="h-4 w-4" /> },
    { key: "history", label: t("vocabulary.tabHistory"), icon: <History className="h-4 w-4" /> },
  ];

  const isLoading = useVocabularyStore((s) => s.isLoading);

  const handleWordAction = useCallback(
    (word: string, action: "again" | "hard" | "good" | "easy") => {
      const store = useVocabularyStore.getState();
      store.recordSRSAction(word, action);
      if (action === "again" || action === "hard") {
        store.updateWordReview(word, false);
      } else {
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowHelp(true)}
              title={t("vocabulary.help.title")}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
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
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{t("vocabulary.stats.own")}: {stats.ownWords}</span>
                <span>{t("vocabulary.stats.teacher")}: {stats.teacherWords}</span>
              </div>
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
              <div className="flex items-center gap-2 mb-4">
                <AutoSelectPanel />
                <div className="flex-1" />
                <div className="flex items-center gap-2 flex-wrap justify-end">
                {selectedWordIds.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setAddToListOpen(true)}
                    >
                      <ListPlus className="h-4 w-4 mr-1" />
                      {t("vocabulary.reviewLists.addToList")}
                    </Button>
                    {isTeacherOrAbove && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => setShareOpen(true)}
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        {t("vocabulary.share.button")}
                      </Button>
                    )}
                  </>
                )}
                <ExportPanel />
                </div>
              </div>
              {selectedWordIds.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
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
                  tab.key !== "history" &&
                  tab.key !== "lists" &&
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
                    tab.key !== "history" &&
                    tab.key !== "lists" &&
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
              onComplete={handleReviewComplete}
            />
          )}
          {activeTab === "quiz" && (
            <VocabularyQuiz
              glossary={reviewGlossary}
              mergedRatings={reviewRatings}
              onWordResult={handleWordResult}
              onComplete={handleReviewComplete}
            />
          )}
          {activeTab === "spelling" && (
            <VocabularySpelling
              glossary={reviewGlossary}
              mergedRatings={reviewRatings}
              onWordResult={handleWordResult}
              onComplete={handleReviewComplete}
            />
          )}
          {activeTab === "history" && <ReviewHistory />}
          {activeTab === "lists" && <ReviewListsTab onReviewList={handleReviewList} />}
          <ShareVocabularyDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            selectedWordIds={selectedWordIds}
            wordCount={selectedWordIds.size}
          />
          <AddToReviewListDialog
            open={addToListOpen}
            onOpenChange={setAddToListOpen}
          />
          <ReviewListShareDialog />

          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  {t("vocabulary.help.title")}
                </DialogTitle>
              </DialogHeader>

              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {(["overview", "review", "extras"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setHelpTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                      helpTab === tab
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(`vocabulary.help.tabs.${tab}`)}
                  </button>
                ))}
              </div>

              {helpTab === "overview" && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {t("vocabulary.help.overview.intro")}
                  </p>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <BookMarked className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.overview.stats.total.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.overview.stats.total.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.overview.stats.due.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.overview.stats.due.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.overview.stats.mastered.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.overview.stats.mastered.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.overview.stats.new.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.overview.stats.new.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Table className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.overview.table.title")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.overview.table.desc")}</p>
                    </div>
                  </div>
                </div>
              )}

              {helpTab === "review" && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {t("vocabulary.help.review.intro")}
                  </p>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.review.flashcard.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.review.flashcard.desc")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-4">
                    {(["again", "hard", "good", "easy"] as const).map((key) => (
                      <div key={key} className="flex gap-2 p-2 rounded-md bg-muted/30">
                        <div className={cn(
                          "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          key === "again" && "bg-rose-500/10 text-rose-500",
                          key === "hard" && "bg-orange-500/10 text-orange-500",
                          key === "good" && "bg-blue-500/10 text-blue-500",
                          key === "easy" && "bg-green-500/10 text-green-500",
                        )}>
                          {key === "again" ? <RotateCcw className="h-3.5 w-3.5" /> : key.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold">{t(`vocabulary.help.review.${key}.name`)}</span>
                          <p className="text-[10px] text-muted-foreground leading-tight">{t(`vocabulary.help.review.${key}.desc`)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.review.quiz.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.review.quiz.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <SpellCheck className="h-5 w-5 text-pink-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.review.spelling.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.review.spelling.desc")}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-xs">
                      <span className="font-semibold">{t("vocabulary.help.review.srs.title")}</span>{" "}
                      <span className="text-muted-foreground">{t("vocabulary.help.review.srs.desc")}</span>
                    </p>
                  </div>
                </div>
              )}

              {helpTab === "extras" && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {t("vocabulary.help.extras.intro")}
                  </p>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.extras.autoSelect.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.extras.autoSelect.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <FileDown className="h-5 w-5 text-teal-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.extras.export.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.extras.export.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <ListChecks className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.extras.reviewLists.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.extras.reviewLists.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Share2 className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.extras.share.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.extras.share.desc")}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center">
                      <History className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{t("vocabulary.help.extras.history.name")}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("vocabulary.help.extras.history.desc")}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("vocabulary.help.extras.tip.title")}</span>{" "}
                      {t("vocabulary.help.extras.tip.content")}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default VocabularyContainer;
