"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Play, CheckCircle, XCircle, RotateCcw, Eye, ArrowLeft, ChevronRight, Trophy, Target, FileDown, ChevronDown, Timer, Crown, Star, Zap, Heart, Flame } from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/formatDate";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { useSession } from "next-auth/react";
import { cn } from "@/utils/style";
import { logActivity } from "@/utils/activityLogger";
import { nanoid } from "nanoid";
import { sortGlossaryByPriority, getWordStats, generateWordCountOptions } from "@/utils/vocabulary";
import GuideDialog from "@/components/Internal/GuideDialog";
import { HelpCircle, PenLine } from "lucide-react";
import { SrsUpdateCard } from "./GameFx";

interface VocabularyQuizProps {
  glossary: GlossaryEntry[];
  mergedRatings?: Record<string, GlossaryRating>;
  /**
   * Per-word SRS callback (PATCH /api/vocabulary/word). May return a promise
   * resolving to the word's SRS outcome — used to render the "spaced
   * repetition updated" card on the result screen. Fire-and-forget callers
   * (void) are fine; the card is simply omitted.
   */
  onWordResult?: (word: string, correct: boolean) => void | Promise<VocabularySrsOutcome | null>;
  onComplete?: (results: { word: string; correct: boolean }[]) => void;
  /**
   * True when rendered outside the reading-session context (e.g. the
   * /vocabulary page). Suppresses stale reading-store session id in
   * activity logs, since `useReadingStore().id` may still hold a stale
   * session id left over from a previous reading session.
   */
  disableSessionGlossary?: boolean;
}

type QuizState = "idle" | "in-progress" | "completed";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatBilingualDefinition(entry: GlossaryEntry): string {
  return `${entry.englishDefinition} (${entry.chineseDefinition})`;
}

function generateQuizQuestions(sortedGlossary: GlossaryEntry[]): VocabularyQuizQuestion[] {
  const questions: VocabularyQuizQuestion[] = [];

  for (const entry of sortedGlossary) {
    const otherEntries = sortedGlossary.filter((e) => e.word !== entry.word);
    const type = ["word-to-definition", "definition-to-word", "fill-blank"][
      Math.floor(Math.random() * 3)
    ] as VocabularyQuizQuestion["type"];

    if (type === "word-to-definition") {
      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => formatBilingualDefinition(e));
      const correctOption = formatBilingualDefinition(entry);
      const options = shuffleArray([correctOption, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: correctOption,
        wordRef: entry.word,
      });
    } else if (type === "definition-to-word") {
      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => e.word);
      const options = shuffleArray([entry.word, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "definition-to-word",
        question: formatBilingualDefinition(entry),
        options,
        correctAnswer: entry.word,
        wordRef: entry.word,
      });
    } else {
      if (entry.example) {
        const blankSentence = entry.example.replace(
          new RegExp(`\\b${entry.word}\\b`, "gi"),
          "______"
        );

        if (blankSentence !== entry.example) {
          const wrongOptions = shuffleArray(otherEntries)
            .slice(0, 3)
            .map((e) => e.word);
          const options = shuffleArray([entry.word, ...wrongOptions]);

          questions.push({
            id: nanoid(),
            type: "fill-blank",
            question: blankSentence,
            options,
            correctAnswer: entry.word,
            wordRef: entry.word,
          });
          continue;
        }
      }

      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => formatBilingualDefinition(e));
      const correctOption = formatBilingualDefinition(entry);
      const options = shuffleArray([correctOption, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: correctOption,
        wordRef: entry.word,
      });
    }
  }

  return questions;
}

type QuizDifficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<QuizDifficulty, { timeLimit: number }> = {
  easy: { timeLimit: 20 },
  medium: { timeLimit: 15 },
  hard: { timeLimit: 10 },
};

function FloatingParticles({ color, count }: { color: string; count: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-60 animate-float-up"
          style={{
            left: `${p.x}%`, bottom: "-10%", width: p.size, height: p.size,
            backgroundColor: color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function getQuizTier(score: number) {
  if (score >= 80) return "master";
  if (score >= 60) return "great";
  if (score >= 40) return "good";
  return "keepGoing";
}

const QUIZ_TIER_CONFIG: Record<string, { emoji: string; icon: typeof Crown; color: string; ring: string; glow: string; badgeBg: string; particleColor: string; gradient: string }> = {
  master:      { emoji: "👑", icon: Crown, color: "text-amber-600 dark:text-amber-400", ring: "ring-4 ring-amber-400/60", glow: "shadow-amber-400/50", badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", particleColor: "#fbbf24", gradient: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)" },
  great:        { emoji: "🌟", icon: Star, color: "text-emerald-600 dark:text-emerald-400", ring: "ring-4 ring-emerald-400/50", glow: "shadow-emerald-400/40", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", particleColor: "#34d399", gradient: "linear-gradient(135deg, rgba(167,243,208,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(167,243,208,0.15) 100%)" },
  good:          { emoji: "💪", icon: Zap, color: "text-blue-600 dark:text-blue-400", ring: "ring-4 ring-blue-400/40", glow: "shadow-blue-400/30", badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", particleColor: "#60a5fa", gradient: "linear-gradient(135deg, rgba(191,219,254,0.15) 0%, rgba(96,165,250,0.08) 50%, rgba(191,219,254,0.15) 100%)" },
  keepGoing:  { emoji: "❤️", icon: Heart, color: "text-rose-600 dark:text-rose-400", ring: "ring-4 ring-rose-400/30", glow: "shadow-rose-400/25", badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", particleColor: "#fb7185", gradient: "linear-gradient(135deg, rgba(254,205,211,0.15) 0%, rgba(251,113,133,0.08) 50%, rgba(254,205,211,0.15) 100%)" },
};

function VocabQuizResultScreen({
  percentage,
  correct,
  total,
  scoreMessage,
  srsOutcomes,
  onReview,
  onRetry,
  onRetryMissed,
  missedCount,
  downloadContent,
  showReview,
}: {
  percentage: number;
  correct: number;
  total: number;
  scoreMessage: string;
  srsOutcomes?: VocabularySrsOutcome[];
  onReview: () => void;
  onRetry: () => void;
  onRetryMissed: () => void;
  missedCount: number;
  downloadContent: React.ReactNode;
  showReview: boolean;
}) {
  const { t } = useTranslation();
  const tier = getQuizTier(percentage);
  const config = QUIZ_TIER_CONFIG[tier];
  const TierIcon = config.icon;
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnimateIn(true), 100); return () => clearTimeout(timer); }, []);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "relative rounded-2xl border-2 p-6 text-center space-y-3 transition-all duration-700 overflow-hidden",
          config.ring,
          animateIn && "shadow-2xl " + config.glow,
          animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{ background: config.gradient }}
      >
        {(tier === "master" || tier === "great") && (
          <FloatingParticles color={config.particleColor} count={tier === "master" ? 20 : 12} />
        )}
        <div className={cn("text-5xl transition-all duration-500 delay-200", animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50")}>
          {config.emoji}
        </div>
        <div className={cn("transition-all duration-500 delay-300", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className={cn("text-5xl font-black", config.color)}>{percentage}%</div>
          <p className="text-sm text-muted-foreground mt-1">{scoreMessage}</p>
          <p className="text-sm text-muted-foreground">
            {t("reading.glossary.quiz.scoreFormat", { correct, total })}
          </p>
        </div>
        <div className={cn("transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", config.badgeBg)}>
            <TierIcon className="h-3.5 w-3.5" />
            {t(`reading.glossary.quiz.resultTier.${tier}`)}
          </span>
        </div>
        {tier === "master" && (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />
        )}
      </div>

      {srsOutcomes && srsOutcomes.length > 0 && <SrsUpdateCard outcomes={srsOutcomes} />}

      <div className={cn("flex gap-2 justify-center flex-wrap transition-all duration-500 [transition-delay:400ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        {downloadContent}
        <Button variant="outline" size="sm" onClick={onReview}>
          <Eye className="h-4 w-4 mr-1" />
          {showReview ? t("reading.glossary.quiz.reviewAnswers") : t("reading.glossary.quiz.reviewAnswers")}
        </Button>
        {missedCount > 0 && (
          <Button variant="secondary" size="sm" onClick={onRetryMissed}>
            <RotateCcw className="h-4 w-4 mr-1" />
            {t("reading.glossary.quiz.retryMissed")} ({missedCount})
          </Button>
        )}
        <Button variant="default" size="sm" onClick={onRetry}>
          <Flame className="h-3.5 w-3.5 mr-1" />
          {t("reading.glossary.quiz.retryQuiz")}
        </Button>
      </div>
    </div>
  );
}

function VocabularyQuiz({ glossary, mergedRatings, onWordResult, onComplete, disableSessionGlossary }: VocabularyQuizProps) {
  const { t } = useTranslation();
  const { id, docTitle, extractedText, vocabularyQuizScore, setVocabularyQuizScore, setVocabularyQuiz, glossaryRatings, backup } = useReadingStore();
  const effectiveId = disableSessionGlossary ? undefined : id;
  const { update, save } = useHistoryStore();
  const { data: session } = useSession();
  const isTeacherOrAbove = session?.user?.role === "teacher" || session?.user?.role === "admin" || session?.user?.role === "super-admin";
  const effectiveRatings = mergedRatings ?? glossaryRatings;

  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<VocabularyQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [prioritizeHardWords, setPrioritizeHardWords] = useState(false);
  const [isTimed, setIsTimed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [questionCountLimit, setQuestionCountLimit] = useState<number | "all">("all");
  // SRS outcomes collected from the parent's onWordResult promises — powers
  // the result screen's "spaced repetition updated" card.
  const [srsOutcomes, setSrsOutcomes] = useState<VocabularySrsOutcome[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty];

  const wordStats = useMemo(() => {
    return getWordStats(glossary, effectiveRatings);
  }, [glossary, effectiveRatings]);

  const startQuiz = useCallback(() => {
    let sortedGlossary = sortGlossaryByPriority(glossary, effectiveRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    if (questionCountLimit !== "all" && sortedGlossary.length > questionCountLimit) {
      sortedGlossary = sortedGlossary.slice(0, questionCountLimit);
    }
    const generatedQuestions = generateQuizQuestions(sortedGlossary);
    setQuestions(generatedQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
    setTimeRemaining(config.timeLimit);
    setSrsOutcomes([]);
  }, [glossary, effectiveRatings, prioritizeHardWords, config.timeLimit, questionCountLimit]);

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  // Shared by both completion paths (submit on last question + timer expiry).
  // Collect SRS outcomes from callers that return them (the result-screen card
  // is omitted for fire-and-forget callers). Failures are swallowed — the card
  // is decorative, never load-bearing.
  const collectSrsOutcomes = useCallback(
    (qs: VocabularyQuizQuestion[], ans: Record<string, string>) => {
      if (!onWordResult) return;
      const outcomes: VocabularySrsOutcome[] = [];
      const settled: Promise<void>[] = [];
      for (const q of qs) {
        const maybe = onWordResult(q.wordRef, ans[q.id] === q.correctAnswer);
        if (maybe && typeof maybe.then === "function") {
          settled.push(
            maybe
              .then((o) => {
                if (o) outcomes.push(o);
              })
              .catch(() => {}),
          );
        }
      }
      if (settled.length > 0) {
        void Promise.all(settled).then(() => setSrsOutcomes(outcomes));
      }
    },
    [onWordResult],
  );

  // Quiz completion, shared by both paths (submit on last question + timer
  // expiry). Runs exactly once per quiz — callers are an event handler and the
  // timer-expiry effect below, never a state updater (React may double-invoke
  // updaters in StrictMode, which would double-fire the PATCH/POST calls).
  const completeQuiz = useCallback(() => {
    const correct = questions.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length;
    const percentage = Math.round((correct / questions.length) * 100);
    if (!disableSessionGlossary) {
      setVocabularyQuizScore(percentage);
    }
    setVocabularyQuiz(questions.map((q) => ({ ...q, userAnswer: answers[q.id] })));
    setQuizState("completed");
    logActivity("quiz_complete", { sessionId: effectiveId || undefined, score: percentage });

    collectSrsOutcomes(questions, answers);

    if (onComplete) {
      const results = questions.map((q) => ({
        word: q.wordRef,
        correct: answers[q.id] === q.correctAnswer,
      }));
      onComplete(results);
    }

    if (!disableSessionGlossary && id) {
      const session = backup();
      const updated = update(id, session);
      if (!updated) {
        save(session);
      }
    }
  }, [questions, answers, disableSessionGlossary, setVocabularyQuizScore, setVocabularyQuiz, effectiveId, collectSrsOutcomes, onComplete, id, backup, update, save]);

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeRemaining(config.timeLimit);
    } else {
      completeQuiz();
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const getScore = useMemo(() => {
    let correct = 0;
    for (const question of questions) {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    }
    return { correct, total: questions.length };
  }, [questions, answers]);

  // Pure countdown tick only — state updaters must stay pure because React may
  // double-invoke them (StrictMode). Reaching 0 signals expiry; the effect
  // below decides what to do about it exactly once per commit.
  useEffect(() => {
    if (quizState === "in-progress" && isTimed) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizState, isTimed]);

  // Timer expiry: advance to the next question (resetting the clock) or, on
  // the last question, complete the quiz. Living in an effect (not inside the
  // setTimeRemaining updater) keeps the network calls in completeQuiz /
  // collectSrsOutcomes firing exactly once, even under StrictMode.
  useEffect(() => {
    if (timeRemaining > 0 || quizState !== "in-progress" || !isTimed) return;
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((idx) => idx + 1);
      setTimeRemaining(config.timeLimit);
    } else {
      completeQuiz();
    }
  }, [timeRemaining, quizState, isTimed, currentQuestionIndex, questions.length, config.timeLimit, completeQuiz]);

  const missedQuestions = useMemo(() => {
    return questions.filter((q) => answers[q.id] !== q.correctAnswer);
  }, [questions, answers]);

  const retryMissed = () => {
    if (missedQuestions.length === 0) return;
    const missedWords = glossary.filter((e) => missedQuestions.some((q) => q.wordRef === e.word));
    const sortedMissed = sortGlossaryByPriority(missedWords, effectiveRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    const newQuestions = generateQuizQuestions(sortedMissed);
    setQuestions(newQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
    setSrsOutcomes([]);
  };

  const downloadWord = useCallback(async (includeAnswers: boolean = false) => {
    const sortedGlossary = sortGlossaryByPriority(glossary, effectiveRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    const questionsToExport = questions.length > 0 ? questions : generateQuizQuestions(sortedGlossary);
    
    if (!questionsToExport.length) return;

    const title = docTitle || extractedText.split(/\n/).find((l) => l.trim()) || "Vocabulary Quiz";
    const generatedAt = formatDateTime(new Date());

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: includeAnswers
              ? `${t("reading.glossary.quiz.answerKeyTitle")} - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`
              : `${t("reading.glossary.quiz.title")} - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`,
            italics: true,
            color: "595959",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    questionsToExport.forEach((question, index) => {
      const typeLabel = question.type === "word-to-definition"
        ? t("reading.glossary.quiz.chooseDefinition")
        : question.type === "definition-to-word"
        ? t("reading.glossary.quiz.chooseWord")
        : t("reading.glossary.quiz.fillBlank");

      children.push(
        new Paragraph({
          text: `${index + 1}. ${question.question}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${typeLabel}]`, color: "666666", size: 20 }),
          ],
          spacing: { after: 100 },
        })
      );

      question.options.forEach((option) => {
        const isCorrect = option === question.correctAnswer;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `   ◯ ${option}`,
                bold: isCorrect && includeAnswers,
                color: isCorrect && includeAnswers ? "22C55E" : "000000",
              }),
            ],
            spacing: { after: 50 },
          })
        );
      });

      if (includeAnswers) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.glossary.quiz.correctAnswer")}: `, bold: true }),
              new TextRun({ text: question.correctAnswer, color: "22C55E" }),
            ],
            spacing: { before: 100, after: 200 },
          })
        );
      }
    });

    try {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1.1),
                  right: convertInchesToTwip(1.1),
                },
                size: { orientation: PageOrientation.PORTRAIT },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFileName = title
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const fileSuffix = includeAnswers 
        ? " - Vocabulary Quiz Answer Key.docx"
        : " - Vocabulary Quiz.docx";
      saveAs(blob, `${safeFileName}${fileSuffix}`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [questions, extractedText, docTitle, glossary, effectiveRatings, prioritizeHardWords, t]);

  if (glossary.length < 4) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.quiz.noQuizWords")}</p>
      </div>
    );
  }

  const hasRatings = wordStats.hard > 0 || wordStats.medium > 0 || wordStats.easy > 0;

  if (quizState === "idle") {
    return (
      <div className="flex flex-col gap-6 py-8">
        <div className="flex justify-center items-start gap-4 relative">
          <div className="text-center relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">{t("reading.glossary.quiz.title")}</h3>
              <GuideDialog
                titleKey="reading.glossary.quiz.aboutTitle"
                introKey="reading.glossary.quiz.aboutDesc"
                itemsBaseKey="reading.glossary.quiz.help.items"
                items={[
                  { key: "chooseDefinition", icon: HelpCircle, bgClass: "bg-primary/10", iconClass: "text-primary" },
                  { key: "chooseWord", icon: Target, bgClass: "bg-primary/10", iconClass: "text-primary" },
                  { key: "fillBlank", icon: PenLine, bgClass: "bg-primary/10", iconClass: "text-primary" },
                ]}
                tipContentKey="reading.glossary.quiz.help.tip"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {t("reading.glossary.quiz.wordsAvailable", { count: glossary.length })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="absolute right-0 top-0">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">{t("reading.glossary.quiz.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadWord(false)}>
                {t("reading.glossary.quiz.downloadBlank")}
              </DropdownMenuItem>
              {(vocabularyQuizScore > 0 || isTeacherOrAbove) && (
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.glossary.quiz.downloadWithAnswers")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-full max-w-md mx-auto space-y-6">
          {hasRatings && (
            <button
              onClick={() => setPrioritizeHardWords(!prioritizeHardWords)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all",
                prioritizeHardWords
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">{t("reading.glossary.prioritizeHard")}</span>
              </div>
              {prioritizeHardWords && (
                <span className="text-xs text-muted-foreground">
                  {t("reading.glossary.wordStats", { 
                    hard: wordStats.hard, 
                    medium: wordStats.medium, 
                    easy: wordStats.easy 
                  })}
                </span>
              )}
            </button>
          )}

          {generateWordCountOptions(glossary.length).length > 0 && (
            <div>
              <label className="text-sm font-medium mb-3 block">
                {t("reading.glossary.quiz.selectQuestionCount")}
              </label>
              <div className="flex flex-wrap gap-2">
                {generateWordCountOptions(glossary.length).map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCountLimit(count)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border-2 transition-all text-sm font-medium",
                      questionCountLimit === count
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {count}
                  </button>
                ))}
                <button
                  onClick={() => setQuestionCountLimit("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border-2 transition-all text-sm font-medium",
                    questionCountLimit === "all"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {t("reading.glossary.allWords")}
                </button>
              </div>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("reading.glossary.quiz.timeChallenge")}</span>
              </div>
              <button
                onClick={() => setIsTimed(!isTimed)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  isTimed ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    isTimed ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {isTimed && (
              <div className="pt-2 border-t">
                <label className="text-sm font-medium mb-3 block">
                  {t("reading.glossary.quiz.selectDifficulty")}
                </label>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as QuizDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium",
                        difficulty === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {t(`reading.glossary.quiz.difficulty.${d}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={startQuiz} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            {t("reading.glossary.quiz.startQuiz")}
          </Button>

          {vocabularyQuizScore > 0 && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{t("reading.glossary.quiz.lastScore")}</span>
                <span className="text-lg font-bold text-primary">{vocabularyQuizScore}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (quizState === "completed") {
    const percentage = Math.round((getScore.correct / getScore.total) * 100);
    const scoreMessage = percentage >= 80
      ? t("reading.glossary.quiz.excellent")
      : percentage >= 60 ? t("reading.glossary.quiz.good") : t("reading.glossary.quiz.keepPracticing");

    return (
      <>
        <VocabQuizResultScreen
          percentage={percentage}
          correct={getScore.correct}
          total={getScore.total}
          scoreMessage={scoreMessage}
          srsOutcomes={srsOutcomes}
          showReview={showReview}
          onReview={() => setShowReview(!showReview)}
          onRetry={startQuiz}
          onRetryMissed={retryMissed}
          missedCount={missedQuestions.length}
          downloadContent={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("reading.glossary.quiz.downloadWord")}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadWord(false)}>
                  {t("reading.glossary.quiz.downloadBlank")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.glossary.quiz.downloadWithAnswers")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {showReview && (
          <div className="space-y-4 mt-6">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div
                  key={question.id}
                  className={cn(
                    "p-4 border rounded-lg",
                    isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="font-bold text-primary">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {question.type === "word-to-definition" &&
                          t("reading.glossary.quiz.chooseDefinition")}
                        {question.type === "definition-to-word" &&
                          t("reading.glossary.quiz.chooseWord")}
                        {question.type === "fill-blank" && t("reading.glossary.quiz.fillBlank")}
                      </p>
                      <p className="font-medium">
                        {question.type === "fill-blank" ? (
                          <span className="italic">&ldquo;{question.question}&rdquo;</span>
                        ) : (
                          question.question
                        )}
                      </p>
                    </div>
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>

                  <div className="ml-6 space-y-1 text-sm">
                    {question.options.map((option) => (
                      <div
                        key={option}
                        className={cn(
                          option === question.correctAnswer && "text-green-600 font-medium",
                          option === userAnswer &&
                            option !== question.correctAnswer &&
                            "text-red-600"
                        )}
                      >
                        {option}
                        {option === question.correctAnswer && " ✓"}
                        {option === userAnswer && option !== question.correctAnswer && " ✘"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  const timerColor =
    timeRemaining <= 3 ? "text-red-500" : timeRemaining <= 7 ? "text-yellow-500" : "text-foreground";

  return (
    <div className="py-4 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {t("reading.glossary.quiz.question")} {currentQuestionIndex + 1}{" "}
            {t("reading.glossary.quiz.of")} {questions.length}
          </span>
          <div className="flex items-center gap-3">
            {isTimed && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", timerColor)}>
                <Timer className="h-4 w-4" />
                {timeRemaining}s
              </div>
            )}
            <span>
              {t("reading.glossary.quiz.pressKey")} →/←
            </span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">
            {currentQuestion.type === "word-to-definition" &&
              t("reading.glossary.quiz.chooseDefinition")}
            {currentQuestion.type === "definition-to-word" &&
              t("reading.glossary.quiz.chooseWord")}
            {currentQuestion.type === "fill-blank" && t("reading.glossary.quiz.fillBlank")}
          </p>
          <p className="text-xl font-medium">
            {currentQuestion.type === "fill-blank" ? (
              <span className="italic">&ldquo;{currentQuestion.question}&rdquo;</span>
            ) : (
              currentQuestion.question
            )}
          </p>
        </div>

        <RadioGroup
          value={currentAnswer || ""}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map((option, index) => (
            <div
              key={option}
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer",
                currentAnswer === option && "border-primary bg-accent"
              )}
              onClick={() => handleAnswer(option)}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("reading.glossary.quiz.previous")}
        </Button>

        <Button onClick={goToNext} disabled={!currentAnswer}>
          {currentQuestionIndex === questions.length - 1
            ? t("reading.glossary.quiz.submitQuiz")
            : t("reading.glossary.quiz.next")}
          {currentQuestionIndex !== questions.length - 1 && (
            <ChevronRight className="h-4 w-4 ml-2" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default VocabularyQuiz;
