"use client";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  BookOpenCheck,
  LoaderCircle,
  HelpCircle,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Highlighter,
  Trophy,
  Gamepad2,
} from "lucide-react";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import GrammarGames from "./GrammarGames";

type TabType = "topics" | "lessons" | "quiz" | "games";

const CATEGORY_COLORS: Record<GrammarTopicCategory, string> = {
  tenses: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  conditionals: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "passive-voice": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "relative-clauses": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "reported-speech": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "modal-verbs": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  articles: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  prepositions: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  conjunctions: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  comparisons: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "infinitives-gerunds": "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  subjunctive: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  "clause-structure": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-cyan-500 text-white",
  A2: "bg-green-500 text-white",
  B1: "bg-amber-500 text-white",
  B2: "bg-orange-500 text-white",
  C1: "bg-red-500 text-white",
  C2: "bg-purple-500 text-white",
};

function Grammar() {
  const { t } = useTranslation();
  const {
    extractedText,
    grammarTopics,
    grammarQuiz,
    grammarQuizScore,
    grammarQuizCompleted: _grammarQuizCompleted,
    grammarQuizEarnedPoints,
    grammarQuizTotalPoints,
    grammarHighlightEnabled,
    grammarHighlightTopicId,
    setGrammarHighlightEnabled,
    setGrammarHighlightTopicId,
  } = useReadingStore();
  const { status, analyzeGrammarTopics, generateGrammarQuiz, calculateGrammarQuizScore, evaluateGrammarOpenAnswer } = useReadingAssistant();

  const [activeTab, setActiveTab] = useState<TabType>("topics");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<GrammarQuizState>("idle");
  const [showReview, setShowReview] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const isAnalyzing = status === "grammar";

  const handleAnalyze = useCallback(async () => {
    await analyzeGrammarTopics();
  }, [analyzeGrammarTopics]);

  const handleGenerateQuiz = useCallback(async () => {
    setIsGeneratingQuiz(true);
    try {
      await generateGrammarQuiz();
    } finally {
      setIsGeneratingQuiz(false);
    }
  }, [generateGrammarQuiz]);

  const handleStartQuiz = useCallback(() => {
    setQuizState("in-progress");
    setShowReview(false);
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    const unanswered = grammarQuiz.filter((q) => !q.userAnswer?.trim());
    if (unanswered.length > 0) {
      return;
    }

    const openQuestions = grammarQuiz.filter(
      (q) => (q.type === "rewrite" || q.type === "fill-in") && q.userAnswer?.trim()
    );

    for (const q of openQuestions) {
      setEvaluatingId(q.id);
      await evaluateGrammarOpenAnswer(q.id, q.question, q.correctAnswer, q.userAnswer!, q.points);
    }
    setEvaluatingId(null);

    calculateGrammarQuizScore();
    setQuizState("completed");
    setShowReview(true);
  }, [grammarQuiz, calculateGrammarQuizScore, evaluateGrammarOpenAnswer]);

  const handleRetry = useCallback(() => {
    const { setGrammarQuiz: setQuiz } = useReadingStore.getState();
    setQuiz(
      grammarQuiz.map((q) => ({
        ...q,
        userAnswer: undefined,
        earnedPoints: undefined,
      }))
    );
    setQuizState("in-progress");
    setShowReview(false);
  }, [grammarQuiz]);

  const handleHighlightTopic = useCallback(
    (topicId: string) => {
      if (grammarHighlightTopicId === topicId && grammarHighlightEnabled) {
        setGrammarHighlightEnabled(false);
        setGrammarHighlightTopicId(null);
      } else {
        setGrammarHighlightTopicId(topicId);
        setGrammarHighlightEnabled(true);
        requestAnimationFrame(() => {
          document.getElementById("grammar-highlighter")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [grammarHighlightEnabled, grammarHighlightTopicId, setGrammarHighlightEnabled, setGrammarHighlightTopicId]
  );

  if (!extractedText) {
    return null;
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "topics",  label: t("reading.grammar.tabTopics"),  icon: <BookOpen className="h-4 w-4" /> },
    { key: "lessons", label: t("reading.grammar.tabLessons"), icon: <GraduationCap className="h-4 w-4" /> },
    { key: "games",   label: t("reading.grammar.tabGames"),   icon: <Gamepad2 className="h-4 w-4" /> },
    { key: "quiz",    label: t("reading.grammar.tabQuiz"),    icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const renderTopicCards = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {grammarTopics.map((topic) => (
        <div
          key={topic.id}
          className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{topic.name}</h4>
              <p className="text-xs text-muted-foreground font-noto-sans-tc">{topic.nameZh}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", CEFR_COLORS[topic.cefrLevel])}>
                {topic.cefrLevel}
              </span>
              <span className={cn("text-xs px-1.5 py-0.5 rounded", CATEGORY_COLORS[topic.category])}>
                {topic.textSentences.length}x
              </span>
            </div>
          </div>
          {expandedTopic === topic.id && (
            <div className="mt-3 space-y-2 text-sm border-t pt-3">
              <p className="text-muted-foreground">{topic.explanation}</p>
              <div className="font-mono bg-muted px-2 py-1 rounded text-xs">
                {topic.pattern}
              </div>
              {topic.textSentences.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("reading.grammar.fromText")}:
                  </p>
                  {topic.textSentences.map((s, i) => (
                    <p key={i} className="text-xs italic bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                      &ldquo;{s}&rdquo;
                    </p>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHighlightTopic(topic.id);
                }}
              >
                <Highlighter className="h-3 w-3 mr-1" />
                {grammarHighlightEnabled && grammarHighlightTopicId === topic.id
                  ? t("reading.grammar.hideHighlight")
                  : t("reading.grammar.showHighlight")}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderLessons = () => (
    <Accordion type="multiple" className="w-full">
      {grammarTopics.map((topic) => (
        <AccordionItem key={topic.id} value={topic.id}>
          <AccordionTrigger className="text-sm hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", CEFR_COLORS[topic.cefrLevel])}>
                {topic.cefrLevel}
              </span>
              <span>{topic.name}</span>
              <span className="text-xs text-muted-foreground font-noto-sans-tc">({topic.nameZh})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div>
                <h5 className="font-medium text-sm mb-1">{t("reading.grammar.whatIsIt")}</h5>
                <p className="text-sm text-muted-foreground">{topic.explanation}</p>
                <p className="text-sm text-muted-foreground font-noto-sans-tc mt-1">{topic.explanationZh}</p>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">{t("reading.grammar.pattern")}</h5>
                <div className="font-mono bg-muted px-3 py-2 rounded text-sm">{topic.pattern}</div>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">{t("reading.grammar.examples")}</h5>
                <div className="space-y-2">
                  {topic.textSentences.map((s, i) => (
                    <div
                      key={`ts-${i}`}
                      className="text-sm px-3 py-2 rounded bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-400"
                    >
                      <p className="italic">&ldquo;{s}&rdquo;</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("reading.grammar.fromThisText")}
                      </p>
                    </div>
                  ))}
                  {topic.examples.filter((ex) => ex.source !== "text").map((ex, i) => (
                    <div
                      key={`ex-${i}`}
                      className="bg-muted text-sm px-3 py-2 rounded"
                    >
                      <p className="italic">&ldquo;{ex.sentence}&rdquo;</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("reading.grammar.example")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">{t("reading.grammar.commonMistakes")}</h5>
                <div className="bg-red-50 dark:bg-red-950 px-3 py-2 rounded text-sm">
                  <p>{topic.commonMistakes}</p>
                  <p className="font-noto-sans-tc mt-1 text-muted-foreground">{topic.commonMistakesZh}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHighlightTopic(topic.id)}
              >
                <Highlighter className="h-3 w-3 mr-1" />
                {grammarHighlightEnabled && grammarHighlightTopicId === topic.id
                  ? t("reading.grammar.hideHighlight")
                  : t("reading.grammar.showHighlight")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  const renderQuizContent = () => {
    if (quizState === "idle") {
      if (grammarQuiz.length === 0) {
        return (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t("reading.grammar.quiz.ready", { count: 0 })}
            </p>
            <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || isAnalyzing}>
              {isGeneratingQuiz ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t("reading.grammar.quiz.generate")}
            </Button>
          </div>
        );
      }
      return (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            {t("reading.grammar.quiz.ready", { count: grammarQuiz.length })}
          </p>
          <Button onClick={handleStartQuiz}>
            {t("reading.grammar.quiz.start")}
          </Button>
          {_grammarQuizCompleted && grammarQuizScore > 0 && (
            <div className="flex justify-center mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{t("reading.grammar.quiz.lastScore")}</span>
                <span className={cn(
                  "text-lg font-bold",
                  grammarQuizScore >= 80
                    ? "text-green-600 dark:text-green-400"
                    : grammarQuizScore >= 60
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                )}>
                  {grammarQuizScore}%
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (quizState === "completed") {
      const scoreColor =
        grammarQuizScore >= 80
          ? "text-green-600 dark:text-green-400"
          : grammarQuizScore >= 60
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-red-600 dark:text-red-400";
      const scoreMessage =
        grammarQuizScore >= 80
          ? t("reading.grammar.quiz.excellent")
          : grammarQuizScore >= 60
            ? t("reading.grammar.quiz.good")
            : t("reading.grammar.quiz.keepPracticing");

      return (
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className={cn("text-4xl font-bold", scoreColor)}>{grammarQuizScore}%</p>
            <p className="text-sm text-muted-foreground mt-1">{scoreMessage}</p>
            <p className="text-sm text-muted-foreground">
              {t("reading.grammar.quiz.pointsFormat", {
                earned: grammarQuizEarnedPoints,
                total: grammarQuizTotalPoints,
              })}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("reading.grammar.quiz.topicBreakdown")}</h4>
            {grammarTopics.map((topic) => {
              const topicQuestions = grammarQuiz.filter((q) => q.topicId === topic.id);
              if (topicQuestions.length === 0) return null;
              const topicCorrect = topicQuestions.filter((q) => {
                if (q.type === "rewrite" || q.type === "fill-in") {
                  return (q.earnedPoints ?? 0) >= q.points;
                }
                const ua = q.userAnswer?.toLowerCase().trim();
                const ca = q.correctAnswer.toLowerCase().trim();
                return ua === ca || ua === ca.charAt(0);
              }).length;
              const topicTotal = topicQuestions.length;
              const pct = Math.round((topicCorrect / topicTotal) * 100);
              return (
                <div key={topic.id} className="flex items-center gap-2 text-sm">
                  <span className="w-32 truncate text-xs">{topic.name}</span>
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {topicCorrect}/{topicTotal}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReview(!showReview)}>
              {showReview ? t("reading.grammar.quiz.hideReview") : t("reading.grammar.quiz.reviewAnswers")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              {t("reading.grammar.quiz.retry")}
            </Button>
          </div>

          {showReview && (
            <div className="space-y-4 mt-4">
              {grammarQuiz.map((q, i) => {
                const isCorrect =
                  q.type === "rewrite" || q.type === "fill-in"
                    ? (q.earnedPoints ?? 0) >= q.points
                    : q.userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() ||
                      q.userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim().charAt(0);
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "border rounded-lg p-3",
                      isCorrect ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {i + 1}. {q.question}
                        </p>
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          <p>
                            {t("reading.grammar.quiz.yourAnswer")}: <span className="font-medium">{q.userAnswer || "-"}</span>
                          </p>
                          <p>
                            {t("reading.grammar.quiz.correctAnswer")}:{" "}
                            <span className="font-medium text-green-600 dark:text-green-400">{q.correctAnswer}</span>
                          </p>
                        </div>
                        {(q.type === "rewrite" || q.type === "fill-in") && q.earnedPoints !== undefined && (
                          <p className="text-xs mt-1">
                            {t("reading.grammar.quiz.pointsFormat", {
                              earned: q.earnedPoints,
                              total: q.points,
                            })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
                        {q.explanationZh && (
                          <p className="text-xs text-muted-foreground font-noto-sans-tc">{q.explanationZh}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const allAnswered = grammarQuiz.every((q) => q.userAnswer?.trim());

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {t("reading.grammar.quiz.questionsReady", { count: grammarQuiz.length })}
          </p>
          <Button
            onClick={handleSubmitQuiz}
            disabled={!allAnswered || evaluatingId !== null}
            size="sm"
          >
            {evaluatingId ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("reading.grammar.quiz.evaluating")}
              </>
            ) : (
              t("reading.grammar.quiz.submit")
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {grammarQuiz.map((q, i) => (
            <div key={q.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {t(`reading.grammar.quiz.types.${q.type}`)}
                </Badge>
                {q.type !== "identify" && (
                  <Badge variant="secondary" className="text-xs">{q.topicName}</Badge>
                )}
              </div>
              <p className="text-sm font-medium mb-3">
                {i + 1}. {q.question}
              </p>

              {q.type === "identify" || q.type === "error-spot" ? (
                <RadioGroup
                  value={q.userAnswer || ""}
                  onValueChange={(val) =>
                    useReadingStore.getState().setGrammarQuizAnswer(q.id, val)
                  }
                >
                  {q.options?.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-1.5">
                      <RadioGroupItem value={opt.charAt(0)} id={`${q.id}-${oi}`} />
                      <Label htmlFor={`${q.id}-${oi}`} className="text-sm font-normal cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Input
                  placeholder={t("reading.grammar.quiz.typeAnswer")}
                  value={q.userAnswer || ""}
                  onChange={(e) =>
                    useReadingStore.getState().setGrammarQuizAnswer(q.id, e.target.value)
                  }
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "topics":
        return renderTopicCards();
      case "lessons":
        return renderLessons();
      case "games":
        return <GrammarGames />;
      case "quiz":
        if (grammarTopics.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpenCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("reading.grammar.analyzeFirst")}</p>
            </div>
          );
        }
        return renderQuizContent();
    }
  };

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-muted-foreground" />
          {t("reading.grammar.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[400px]" align="start">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-base">{t("reading.grammar.help.title")}</h4>
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("reading.grammar.help.purpose")}</p>
                  <p className="text-muted-foreground">{t("reading.grammar.help.features")}</p>
                  <p className="text-muted-foreground">{t("reading.grammar.help.usage")}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            size="sm"
            variant={grammarTopics.length > 0 ? "secondary" : "default"}
          >
            {isAnalyzing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.grammar.analyzing")}</span>
              </>
            ) : grammarTopics.length > 0 ? (
              <>
                <BookOpenCheck className="h-4 w-4" />
                <span>{t("reading.grammar.regenerate")}</span>
              </>
            ) : (
              <>
                <BookOpenCheck className="h-4 w-4" />
                <span>{t("reading.grammar.analyze")}</span>
              </>
            )}
          </Button>
          {grammarTopics.length > 0 && (
            <Button
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || isAnalyzing}
              size="sm"
              variant="secondary"
            >
              {isGeneratingQuiz ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>
                {grammarQuiz.length > 0
                  ? t("reading.grammar.quiz.regenerate")
                  : t("reading.grammar.quiz.generate")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {grammarTopics.length > 0 ? (
        <>
          <div className="flex gap-1 mb-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          {renderContent()}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpenCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.grammar.analyzeFirst")}</p>
        </div>
      )}
    </section>
  );
}

export default Grammar;
