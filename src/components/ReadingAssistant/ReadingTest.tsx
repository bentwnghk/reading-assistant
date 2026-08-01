"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardCheck,
  LoaderCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Languages,
  ArrowLeft,
  ChevronRight,
  Trophy,
  Eye,
  BarChart3,
  Target,
  FileDown,
  ChevronDown,
  Crown,
  Star,
  Zap,
  Heart,
  ListChecks,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useSession } from "next-auth/react";
import { cn } from "@/utils/style";
import { logActivity } from "@/utils/activityLogger";
import { getReadingTestPreset } from "@/constants/readingPrompts";
import NumberStepper from "@/components/Internal/NumberStepper";

const MIN_TOTAL_QUESTIONS = 10;
const MAX_TOTAL_QUESTIONS = 20;
const MAX_PER_TYPE = 10;

type QuizState = "idle" | "in-progress" | "completed";

const QUESTION_TYPE_LABELS: Record<ReadingTestQuestionType, string> = {
  "multiple-choice": "multipleChoice",
  "true-false-not-given": "trueFalseNG",
  "short-answer": "shortAnswer",
  "inference": "inference",
  "vocab-context": "vocabContext",
  "referencing": "referencing",
};

const SKILL_LABELS: Record<string, string> = {
  "main-idea": "mainIdea",
  "detail": "detail",
  "inference": "inference",
  "vocabulary": "vocabulary",
  "purpose": "purpose",
  "referencing": "detail",
};

function ReadingTestGuide() {
  return (
    <GuideDialog
      titleKey="reading.readingTest.help.title"
      introKey="reading.readingTest.help.intro"
      itemsBaseKey="reading.readingTest.help.items"
      items={[
        { key: "types", icon: ClipboardCheck, bgClass: "bg-primary/10", iconClass: "text-primary" },
        { key: "customise", icon: SlidersHorizontal, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
        { key: "report", icon: TrendingUp, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
        { key: "practise", icon: Target, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
      ]}
      stepsTitleKey="reading.readingTest.help.stepsTitle"
      stepsKeys={[
        "reading.readingTest.help.steps.s1",
        "reading.readingTest.help.steps.s2",
        "reading.readingTest.help.steps.s3",
        "reading.readingTest.help.steps.s4",
      ]}
      tipTitleKey="reading.readingTest.help.tipTitle"
      tipContentKey="reading.readingTest.help.tipContent"
    />
  );
}

function FloatingParticles({ color, count }: { color: string; count: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 2, duration: 2 + Math.random() * 2, size: 4 + Math.random() * 6,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full opacity-60 animate-float-up"
          style={{ left: `${p.x}%`, bottom: "-10%", width: p.size, height: p.size, backgroundColor: color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
    </div>
  );
}

function getResultTier(score: number) {
  if (score >= 80) return "master";
  if (score >= 60) return "great";
  if (score >= 40) return "good";
  return "keepGoing";
}

const TEST_TIER_CONFIG: Record<string, { emoji: string; icon: typeof Crown; color: string; ring: string; glow: string; badgeBg: string; particleColor: string; gradient: string }> = {
  master:    { emoji: "👑", icon: Crown, color: "text-amber-600 dark:text-amber-400", ring: "ring-4 ring-amber-400/60", glow: "shadow-amber-400/50", badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", particleColor: "#fbbf24", gradient: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)" },
  great:      { emoji: "🌟", icon: Star, color: "text-emerald-600 dark:text-emerald-400", ring: "ring-4 ring-emerald-400/50", glow: "shadow-emerald-400/40", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", particleColor: "#34d399", gradient: "linear-gradient(135deg, rgba(167,243,208,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(167,243,208,0.15) 100%)" },
  good:       { emoji: "💪", icon: Zap, color: "text-blue-600 dark:text-blue-400", ring: "ring-4 ring-blue-400/40", glow: "shadow-blue-400/30", badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", particleColor: "#60a5fa", gradient: "linear-gradient(135deg, rgba(191,219,254,0.15) 0%, rgba(96,165,250,0.08) 50%, rgba(191,219,254,0.15) 100%)" },
  keepGoing: { emoji: "❤️", icon: Heart, color: "text-rose-600 dark:text-rose-400", ring: "ring-4 ring-rose-400/30", glow: "shadow-rose-400/25", badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", particleColor: "#fb7185", gradient: "linear-gradient(135deg, rgba(254,205,211,0.15) 0%, rgba(251,113,133,0.08) 50%, rgba(254,205,211,0.15) 100%)" },
};

function TestResultScreen({
  score, scoreMessage, earnedPoints, totalPoints,
}: {
  score: number; scoreMessage: string; earnedPoints: number; totalPoints: number;
}) {
  const { t } = useTranslation();
  const tier = getResultTier(score);
  const config = TEST_TIER_CONFIG[tier];
  const TierIcon = config.icon;
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnimateIn(true), 100); return () => clearTimeout(timer); }, []);

  return (
    <div
      className={cn("relative rounded-2xl border-2 p-6 text-center space-y-3 transition-all duration-700 overflow-hidden", config.ring, animateIn && "shadow-2xl " + config.glow, animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95")}
      style={{ background: config.gradient }}
    >
      {(tier === "master" || tier === "great") && <FloatingParticles color={config.particleColor} count={tier === "master" ? 20 : 12} />}
      <div className={cn("text-5xl transition-all duration-500 delay-200", animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50")}>{config.emoji}</div>
      <div className={cn("transition-all duration-500 delay-300", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <div className={cn("text-5xl font-black", config.color)}>{score}%</div>
        <p className="text-sm text-muted-foreground mt-1">{scoreMessage}</p>
        <p className="text-sm text-muted-foreground">{t("reading.readingTest.pointsFormat", { earned: earnedPoints, total: totalPoints })}</p>
      </div>
      <div className={cn("transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", config.badgeBg)}><TierIcon className="h-3.5 w-3.5" />{t(`reading.readingTest.resultTier.${tier}`)}</span>
      </div>
      {tier === "master" && <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />}
    </div>
  );
}

function ReadingTest() {
  const { t } = useTranslation();
  const {
    extractedText,
    docTitle,
    readingTest,
    testScore,
    testCompleted,
    testEarnedPoints,
    testTotalPoints,
    testShowChinese,
    testMode,
    setTestShowChinese,
    setTestMode,
    studentAge,
  } = useReadingStore();
  const { activeGenerations, generateReadingTest, generateTargetedPractice, calculateTestScore, evaluateShortAnswer } = useReadingAssistant();
  const { data: session } = useSession();
  const isTeacherOrAbove = session?.user?.role === "teacher" || session?.user?.role === "admin" || session?.user?.role === "super-admin";
  
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [evaluatingShortAnswer, setEvaluatingShortAnswer] = useState(false);
  const [retryMissedIds, setRetryMissedIds] = useState<Set<string>>(new Set());
  const [questionCounts, setQuestionCounts] = useState<ReadingTestQuestionCounts>(() => getReadingTestPreset(studentAge));
  const [historicalWeakestSkill, setHistoricalWeakestSkill] = useState<ReadingTestSkill | null>(null);

  // Fetch the learner's cross-session weakest skill so targeted practice can
  // include the chronic weak area, not just the current test's misses.
  useEffect(() => {
    fetch("/api/skill-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.weakestSkill) {
          setHistoricalWeakestSkill(data.weakestSkill as ReadingTestSkill);
        }
      })
      .catch(() => {});
  }, []);

  const isGenerating = !!activeGenerations["reading-test"] || !!activeGenerations["targeted-practice"];

  const totalQuestionCount = (Object.values(questionCounts) as number[]).reduce((sum, n) => sum + n, 0);
  const isTotalValid = totalQuestionCount >= MIN_TOTAL_QUESTIONS && totalQuestionCount <= MAX_TOTAL_QUESTIONS;

  const updateQuestionCount = (type: ReadingTestQuestionType, value: number) => {
    setQuestionCounts((prev) => {
      const next = { ...prev, [type]: value };
      const nextTotal = (Object.values(next) as number[]).reduce((sum, n) => sum + n, 0);
      if (nextTotal > MAX_TOTAL_QUESTIONS) {
        return prev;
      }
      return next;
    });
  };

  const resetQuestionCounts = () => setQuestionCounts(getReadingTestPreset(studentAge));

  const handleAnswerChange = (questionId: string, answer: string) => {
    useReadingStore.getState().setUserAnswer(questionId, answer);
  };

  const startTest = useCallback(() => {
    if (testMode === "question-by-question") {
      setQuizState("in-progress");
      setCurrentQuestionIndex(0);
      setShowReview(false);
    } else {
      setQuizState("in-progress");
      setShowReview(false);
    }
  }, [testMode]);

  const handleSubmit = async () => {
    setEvaluatingShortAnswer(true);
    
    for (const question of readingTest) {
      if (question.type === "short-answer" && question.userAnswer) {
        await evaluateShortAnswer(
          question.id,
          question.question,
          question.correctAnswer,
          question.userAnswer,
          question.points
        );
      }
    }
    
    setEvaluatingShortAnswer(false);
    calculateTestScore();
    setQuizState("completed");
    setShowReview(true);
    // Log test completion for leaderboard
    const { id: sessionId, testScore } = useReadingStore.getState();
    logActivity("test_complete", { sessionId: sessionId || undefined, score: testScore });
  };

  const handleReset = () => {
    useReadingStore.getState().setTestCompleted(false);
    useReadingStore.getState().setTestScore(0);
    useReadingStore.getState().setTestPoints(0, 0);
    useReadingStore.getState().readingTest.forEach((q) => {
      useReadingStore.getState().setUserAnswer(q.id, "");
      if (q.type === "short-answer") {
        useReadingStore.getState().setQuestionEarnedPoints(q.id, 0);
      }
    });
    setQuizState("idle");
    setShowReview(false);
    setCurrentQuestionIndex(0);
    setRetryMissedIds(new Set());
  };

  const handleRetryMissed = () => {
    const missedIds = new Set(missedQuestions.map(q => q.id));
    missedQuestions.forEach((q) => {
      useReadingStore.getState().setUserAnswer(q.id, "");
      if (q.type === "short-answer") {
        useReadingStore.getState().setQuestionEarnedPoints(q.id, 0);
      }
    });
    useReadingStore.getState().setTestCompleted(false);
    useReadingStore.getState().setTestScore(0);
    useReadingStore.getState().setTestPoints(0, 0);
    setRetryMissedIds(missedIds);
    setQuizState("in-progress");
    setShowReview(false);
    setCurrentQuestionIndex(0);
  };

  const questionsToDisplay = useMemo(() => {
    if (retryMissedIds.size > 0) {
      return readingTest.filter(q => retryMissedIds.has(q.id));
    }
    return readingTest;
  }, [readingTest, retryMissedIds]);

  const goToNext = () => {
    if (currentQuestionIndex < questionsToDisplay.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const missedQuestions = useMemo(() => {
    return readingTest.filter((q) => {
      if (q.type === "short-answer") {
        return (q.earnedPoints ?? 0) < q.points;
      }
      const userAnswer = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
        return userAnswer !== correctAnswer && userAnswer !== correctAnswer.charAt(0);
      }
      return userAnswer !== correctAnswer;
    });
  }, [readingTest]);

  const skillStats = useMemo(() => {
    const stats: Record<string, { earned: number; total: number; correct: number; count: number }> = {};
    readingTest.forEach((q) => {
      const skill = q.skillTested;
      if (!stats[skill]) {
        stats[skill] = { earned: 0, total: 0, correct: 0, count: 0 };
      }
      stats[skill].total += q.points;
      stats[skill].count += 1;
      
      if (q.type === "short-answer") {
        stats[skill].earned += q.earnedPoints ?? 0;
        if ((q.earnedPoints ?? 0) >= q.points) {
          stats[skill].correct += 1;
        }
      } else {
        const userAnswer = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
        const correctAnswer = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
        let isCorrect = false;
        if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
          isCorrect = userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0);
        } else {
          isCorrect = userAnswer === correctAnswer;
        }
        if (isCorrect) {
          stats[skill].earned += q.points;
          stats[skill].correct += 1;
        }
      }
    });
    return stats;
  }, [readingTest]);

  const missedSkills = useMemo(() => {
    const skills: ReadingTestSkill[] = [];
    Object.entries(skillStats).forEach(([skill, stats]) => {
      const percentage = stats.total > 0 ? (stats.earned / stats.total) * 100 : 0;
      if (percentage < 100) {
        skills.push(skill as ReadingTestSkill);
      }
    });
    return skills;
  }, [skillStats]);

  const handleTargetedPractice = async () => {
    // Merge the current test's missed skills with the learner's historical
    // weakest skill (cross-session profile) so practice targets chronic gaps.
    const skills: ReadingTestSkill[] = [...missedSkills];
    if (historicalWeakestSkill && !skills.includes(historicalWeakestSkill)) {
      skills.push(historicalWeakestSkill);
    }
    if (skills.length === 0) return;
    
    setRetryMissedIds(new Set());
    setCurrentQuestionIndex(0);
    setShowReview(false);
    
    const questions = await generateTargetedPractice(skills);
    
    if (questions && questions.length > 0) {
      setQuizState("in-progress");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const downloadWord = useCallback(async (includeAnswers: boolean = false) => {
    if (!readingTest.length) return;

    const title = docTitle || extractedText.split(/\n/).find((l) => l.trim()) || "Reading Test";
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
              ? `${t("reading.readingTest.answerKey")} - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`
              : `${t("reading.readingTest.title")} - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`,
            italics: true,
            color: "595959",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    readingTest.forEach((question, index) => {
      const typeLabelKey = QUESTION_TYPE_LABELS[question.type] || question.type;
      const skillLabelKey = SKILL_LABELS[question.skillTested] || question.skillTested;
      const typeLabel = t(`reading.readingTest.${typeLabelKey}`);
      const skillLabel = t(`reading.readingTest.skills.${skillLabelKey}`);
      const paragraphLabel = question.paragraphRef ? t("reading.readingTest.paragraph", { num: question.paragraphRef }) : null;

      children.push(
        new Paragraph({
          text: `${index + 1}. ${question.question}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      const metaText = paragraphLabel 
        ? `[${typeLabel}] [${skillLabel}] [${paragraphLabel}]`
        : `[${typeLabel}] [${skillLabel}]`;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: metaText, color: "666666", size: 20 }),
          ],
          spacing: { after: 100 },
        })
      );

      if ((question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") && question.options) {
        const normalizedCorrectAnswer = question.correctAnswer.toUpperCase().trim();
        question.options.forEach((option, _optIndex) => {
          const isCorrect = option.charAt(0).toUpperCase() === normalizedCorrectAnswer.charAt(0);
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
      }

      if (question.type === "true-false-not-given") {
        const options = [
          { label: t("reading.readingTest.true"), value: "true" },
          { label: t("reading.readingTest.false"), value: "false" },
          { label: t("reading.readingTest.notGiven"), value: "not-given" },
        ];
        const normalizedCorrectAnswer = question.correctAnswer.toLowerCase().trim();
        options.forEach((opt) => {
          const isCorrect = opt.value === normalizedCorrectAnswer;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ◯ ${opt.label}`,
                  bold: isCorrect && includeAnswers,
                  color: isCorrect && includeAnswers ? "22C55E" : "000000",
                }),
              ],
              spacing: { after: 50 },
            })
          );
        });
      }

      if (question.type === "short-answer") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   ${t("reading.readingTest.shortAnswerPlaceholder")}`, italics: true, color: "888888" }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (includeAnswers) {
        if (question.type === "short-answer") {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.suggestedAnswer")}: `, bold: true }),
                new TextRun({ text: question.correctAnswer }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.suggestedAnswer")}: `, bold: true }),
                new TextRun({ text: question.correctAnswer, color: "22C55E" }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        }

        if (question.explanation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.explanation")}: `, bold: true }),
                new TextRun({ text: question.explanation }),
              ],
              spacing: { after: 200 },
            })
          );
        }
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
      const fileSuffix = includeAnswers ? " - Reading Test Answer Key.docx" : " - Reading Test.docx";
      saveAs(blob, `${safeFileName}${fileSuffix}`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [readingTest, extractedText, docTitle, t]);

  const renderQuestion = (question: ReadingTestQuestion, index: number, showResult: boolean = false) => {
    let isCorrect = false;
    if (question.type === "short-answer") {
      isCorrect = (question.earnedPoints ?? 0) >= question.points;
    } else {
      const userAnswer = question.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = question.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      if (question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") {
        isCorrect = userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0);
      } else {
        isCorrect = userAnswer === correctAnswer;
      }
    }

    const typeLabelKey = QUESTION_TYPE_LABELS[question.type] || question.type;
    const skillLabelKey = SKILL_LABELS[question.skillTested] || question.skillTested;

    return (
      <div
        key={question.id}
        className={cn(
          "p-4 border rounded-lg",
          showResult && question.type !== "short-answer" && (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"),
          showResult && question.type === "short-answer" && (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950")
        )}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="font-bold text-primary">{index + 1}.</span>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-1">
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {t(`reading.readingTest.${typeLabelKey}`)}
              </span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {t(`reading.readingTest.skills.${skillLabelKey}`)}
              </span>
              {question.paragraphRef && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                  {t("reading.readingTest.paragraph", { num: question.paragraphRef })}
                </span>
              )}
            </div>
            <p className="font-medium">{question.question}</p>
            {testShowChinese && question.questionZh && (
              <p className="text-sm text-muted-foreground mt-1">{question.questionZh}</p>
            )}
          </div>
          {showResult && (
            question.type === "short-answer" ? (
              <div className="text-right">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <span className={cn("text-sm font-medium", getScoreColor(Math.round(((question.earnedPoints ?? 0) / question.points) * 100)))}>
                    {question.earnedPoints ?? 0}/{question.points}
                  </span>
                )}
              </div>
            ) : (
              isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )
            )
          )}
        </div>

        {(question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") && question.options && (
          <RadioGroup
            value={question.userAnswer || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={showResult}
            className="space-y-2 ml-6"
          >
            {question.options.map((option, optIndex) => (
              <div
                key={optIndex}
                className={cn(
                  "flex items-start space-x-2",
                  showResult && option.charAt(0) === question.correctAnswer && "text-green-600 font-medium"
                )}
              >
                <RadioGroupItem value={option.charAt(0)} id={`${question.id}-${optIndex}`} />
                <div className="flex-1">
                  <Label htmlFor={`${question.id}-${optIndex}`}>{option}</Label>
                  {testShowChinese && question.optionsZh?.[optIndex] && (
                    <p className="text-xs text-muted-foreground">{question.optionsZh[optIndex]}</p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "true-false-not-given" && (
          <RadioGroup
            value={question.userAnswer || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={showResult}
            className="space-y-2 ml-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${question.id}-true`} />
              <Label htmlFor={`${question.id}-true`}>{t("reading.readingTest.true")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${question.id}-false`} />
              <Label htmlFor={`${question.id}-false`}>{t("reading.readingTest.false")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not-given" id={`${question.id}-not-given`} />
              <Label htmlFor={`${question.id}-not-given`}>{t("reading.readingTest.notGiven")}</Label>
            </div>
          </RadioGroup>
        )}

        {question.type === "short-answer" && (
          <div className="ml-6">
            <Input
              value={question.userAnswer || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={t("reading.readingTest.shortAnswerPlaceholder")}
              disabled={showResult}
              className="mt-2"
            />
            {showResult && question.correctAnswer && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>{t("reading.readingTest.suggestedAnswer")}:</strong> {question.correctAnswer}
              </p>
            )}
          </div>
        )}

        {showResult && question.explanation && (
          <div className="mt-3 p-3 bg-muted rounded text-sm">
            <strong>{t("reading.readingTest.explanation")}:</strong> {question.explanation}
            {testShowChinese && question.explanationZh && (
              <p className="mt-1 text-muted-foreground">{question.explanationZh}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!extractedText) {
    return null;
  }

  if (!readingTest.length) {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
            <ReadingTestGuide />
          </h3>
          <Button
            onClick={() => generateReadingTest(questionCounts)}
            disabled={isGenerating || !isTotalValid}
            size="sm"
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.readingTest.generating")}</span>
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                <span>{t("reading.readingTest.generate")}</span>
              </>
            )}
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t("reading.readingTest.setupTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("reading.readingTest.setupDesc")}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={resetQuestionCounts}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t("reading.readingTest.resetPreset")}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["multiple-choice", "true-false-not-given", "inference", "vocab-context", "referencing", "short-answer"] as ReadingTestQuestionType[]).map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <Label className="text-sm font-medium cursor-default">
                    {t(`reading.readingTest.${QUESTION_TYPE_LABELS[type]}`)}
                  </Label>
                  <NumberStepper
                    value={questionCounts[type]}
                    onChange={(v) => updateQuestionCount(type, v)}
                    min={0}
                    max={Math.min(MAX_PER_TYPE, questionCounts[type] + (MAX_TOTAL_QUESTIONS - totalQuestionCount))}
                    disabled={isGenerating}
                    aria-label={t(`reading.readingTest.${QUESTION_TYPE_LABELS[type]}`)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
              isTotalValid
                ? "border-muted bg-muted/30"
                : "border-destructive/40 bg-destructive/5",
            )}
          >
            <span className="font-medium">{t("reading.readingTest.totalQuestions")}</span>
            <span className={cn("font-semibold tabular-nums", isTotalValid ? "text-foreground" : "text-destructive")}>
              {totalQuestionCount} / {MIN_TOTAL_QUESTIONS}–{MAX_TOTAL_QUESTIONS}
            </span>
          </div>
          {!isTotalValid && (
            <p className="text-xs text-destructive">
              {t("reading.readingTest.totalRangeError", { min: MIN_TOTAL_QUESTIONS, max: MAX_TOTAL_QUESTIONS })}
            </p>
          )}
          <div className="text-center py-2 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("reading.readingTest.emptyTip")}</p>
          </div>
        </div>
      </section>
    );
  }

  if (quizState === "idle") {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
            <ReadingTestGuide />
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.readingTest.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadWord(false)}>
                {t("reading.readingTest.downloadBlank")}
              </DropdownMenuItem>
              {(testCompleted || isTeacherOrAbove) && (
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.readingTest.downloadWithAnswers")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <p className="font-medium">{t("reading.readingTest.questionByQuestion")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("reading.readingTest.modeDesc")}</p>
            </div>
            <Switch
              checked={testMode === "question-by-question"}
              onCheckedChange={(checked: boolean) => setTestMode(checked ? "question-by-question" : "all-at-once")}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <p className="font-medium">{t("reading.readingTest.showChinese")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("reading.readingTest.chineseDesc")}</p>
            </div>
            <Switch
              checked={testShowChinese}
              onCheckedChange={setTestShowChinese}
            />
          </div>

          <div className="text-center">
            {testCompleted ? (
              <>
                <div className="flex flex-col gap-3 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">
                      {t("reading.readingTest.completedTip")}
                    </p>
                    <Button onClick={() => generateReadingTest(questionCounts)} disabled={isGenerating} size="lg">
                      {isGenerating ? (
                        <>
                          <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
                          {t("reading.readingTest.generating")}
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-5 w-5 mr-2" />
                          {t("reading.readingTest.generateNew")}
                        </>
                      )}
                    </Button>
                  </div>
                  {missedSkills.length > 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">
                        {t("reading.readingTest.practiceMissedSkillsDesc")}
                      </p>
                      <Button 
                        variant="secondary" 
                        onClick={handleTargetedPractice}
                        disabled={isGenerating}
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
                            {t("reading.readingTest.generating")}
                          </>
                        ) : (
                          <>
                            <Target className="h-5 w-5 mr-2" />
                            {t("reading.readingTest.practiceMissedSkills", { count: missedSkills.length })}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  {t("reading.readingTest.questionsAvailable", { count: readingTest.length })}
                </p>
                <Button onClick={startTest} size="lg">
                  <ClipboardCheck className="h-5 w-5 mr-2" />
                  {t("reading.readingTest.startTest")}
                </Button>
              </>
            )}
            {testCompleted && testScore > 0 && (
              <div className="flex justify-center mt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{t("reading.readingTest.lastScore")}</span>
                  <span className={cn("text-lg font-bold", getScoreColor(testScore))}>
                    {testScore}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (quizState === "completed") {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
            <ReadingTestGuide />
          </h3>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("reading.readingTest.downloadWord")}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadWord(false)}>
                  {t("reading.readingTest.downloadBlank")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.readingTest.downloadWithAnswers")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t("reading.readingTest.retry")}</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <TestResultScreen
            score={testScore}
            scoreMessage={
              testScore >= 80
                ? t("reading.readingTest.excellent")
                : testScore >= 60 ? t("reading.readingTest.good") : t("reading.readingTest.keepPracticing")
            }
            earnedPoints={testEarnedPoints}
            totalPoints={testTotalPoints}
          />

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              <h4 className="font-medium">{t("reading.readingTest.skillBreakdown")}</h4>
            </div>
            <div className="space-y-3">
              {Object.entries(skillStats).map(([skill, stats]) => (
                <div key={skill}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t(`reading.readingTest.skills.${SKILL_LABELS[skill as ReadingTestSkill]}`)}</span>
                    <span className={cn(
                      "font-medium",
                      getScoreColor(Math.round((stats.earned / stats.total) * 100))
                    )}>
                      {stats.correct}/{stats.count} ({Math.round((stats.earned / stats.total) * 100)}%)
                    </span>
                  </div>
                  <Progress value={(stats.earned / stats.total) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" onClick={() => setShowReview(!showReview)}>
              <Eye className="h-4 w-4 mr-2" />
              {showReview ? t("reading.readingTest.hideReview") : t("reading.readingTest.reviewAnswers")}
            </Button>
            {missedSkills.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={handleTargetedPractice}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    {t("reading.readingTest.generating")}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {t("reading.readingTest.practiceMissedSkills", { count: missedSkills.length })}
                  </>
                )}
              </Button>
            )}
            {missedQuestions.length > 0 && (
              <Button variant="secondary" onClick={handleRetryMissed}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("reading.readingTest.retryMissed", { count: missedQuestions.length })}
              </Button>
            )}
          </div>

          {showReview && (
            <div className="space-y-4 mt-6">
              {readingTest.map((question, index) => renderQuestion(question, index, true))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (testMode === "question-by-question" && quizState === "in-progress") {
    const currentQuestion = questionsToDisplay[currentQuestionIndex];
    const currentAnswer = currentQuestion?.userAnswer;
    const allAnswered = questionsToDisplay.every((q) => q.userAnswer && q.userAnswer.trim() !== "");

    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
            <ReadingTestGuide />
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestShowChinese(!testShowChinese)}
            >
              <Languages className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {t("reading.readingTest.question")} {currentQuestionIndex + 1}{" "}
                {t("reading.readingTest.of")} {questionsToDisplay.length}
              </span>
              <span>
                {t("reading.readingTest.pressKey")} →/←
              </span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questionsToDisplay.length) * 100} className="h-2" />
          </div>

          {currentQuestion && renderQuestion(currentQuestion, currentQuestionIndex, false)}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("reading.readingTest.previous")}
            </Button>

            {currentQuestionIndex === questionsToDisplay.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!allAnswered || evaluatingShortAnswer}
              >
                {evaluatingShortAnswer ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                    {t("reading.readingTest.evaluating")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("reading.readingTest.submit")}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goToNext} disabled={!currentAnswer}>
                {t("reading.readingTest.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
            <ReadingTestGuide />
          </h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestShowChinese(!testShowChinese)}
            >
              <Languages className="h-4 w-4" />
            </Button>
          </div>
        </div>

      <div className="space-y-6">
        {questionsToDisplay.map((question, index) => renderQuestion(question, index, false))}

        <div className="flex justify-center pt-2">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={evaluatingShortAnswer}
          >
            {evaluatingShortAnswer ? (
              <>
                <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
                {t("reading.readingTest.evaluating")}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                {t("reading.readingTest.submit")}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default ReadingTest;
