"use client";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  BookOpenCheck,
  LoaderCircle,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Highlighter,
  Trophy,
  Gamepad2,
  Crown,
  Star,
  Zap,
  Heart,
  Flame,
  FileDown,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
  ListChecks,
  ClipboardList,
  Lightbulb,
  Volume2,
  GitCompare,
  Wand2,
  Sparkles,
  RotateCcw,
  Tag,
  TriangleAlert,
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
import { useSession } from "next-auth/react";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GuideDialog from "@/components/Internal/GuideDialog";
import { Progress } from "@/components/ui/progress";
import GrammarGames from "./GrammarGames";

type TabType = "topics" | "lessons" | "quiz" | "games";

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
            left: `${p.x}%`,
            bottom: "-10%",
            width: p.size,
            height: p.size,
            backgroundColor: color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
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

const BOLD_MARKER_RE = /(\*\*[^*]+\*\*)/g;

function renderFormattedText(text: string) {
  const parts = text.split(BOLD_MARKER_RE);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <u key={i} className="font-semibold">{part.slice(2, -2)}</u>;
    }
    return part;
  });
}

function questionToTextRuns(text: string): TextRun[] {
  return text.split(BOLD_MARKER_RE).map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), underline: {} });
    }
    return new TextRun({ text: part });
  });
}

const QUIZ_TIER_CONFIG: Record<string, { emoji: string; icon: typeof Crown; color: string; ring: string; glow: string; badgeBg: string; particleColor: string; gradient: string }> = {
  master:      { emoji: "👑", icon: Crown, color: "text-amber-600 dark:text-amber-400", ring: "ring-4 ring-amber-400/60", glow: "shadow-amber-400/50", badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", particleColor: "#fbbf24", gradient: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)" },
  great:        { emoji: "🌟", icon: Star, color: "text-emerald-600 dark:text-emerald-400", ring: "ring-4 ring-emerald-400/50", glow: "shadow-emerald-400/40", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", particleColor: "#34d399", gradient: "linear-gradient(135deg, rgba(167,243,208,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(167,243,208,0.15) 100%)" },
  good:          { emoji: "💪", icon: Zap, color: "text-blue-600 dark:text-blue-400", ring: "ring-4 ring-blue-400/40", glow: "shadow-blue-400/30", badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", particleColor: "#60a5fa", gradient: "linear-gradient(135deg, rgba(191,219,254,0.15) 0%, rgba(96,165,250,0.08) 50%, rgba(191,219,254,0.15) 100%)" },
  keepGoing:  { emoji: "❤️", icon: Heart, color: "text-rose-600 dark:text-rose-400", ring: "ring-4 ring-rose-400/30", glow: "shadow-rose-400/25", badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", particleColor: "#fb7185", gradient: "linear-gradient(135deg, rgba(254,205,211,0.15) 0%, rgba(251,113,133,0.08) 50%, rgba(254,205,211,0.15) 100%)" },
};

function QuizResultScreen({
  score,
  earnedPoints,
  totalPoints,
  topicBreakdown,
  onReview,
  onRetry,
  showReview,
  scoreMessage,
}: {
  score: number;
  earnedPoints: number;
  totalPoints: number;
  topicBreakdown: React.ReactNode;
  onReview: () => void;
  onRetry: () => void;
  showReview: boolean;
  scoreMessage: string;
}) {
  const { t } = useTranslation();
  const tier = getQuizTier(score);
  const config = QUIZ_TIER_CONFIG[tier];
  const TierIcon = config.icon;
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimateIn(true), 100); return () => clearTimeout(t); }, []);

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
          <div className={cn("text-5xl font-black", config.color)}>{score}%</div>
          <p className="text-sm text-muted-foreground mt-1">{scoreMessage}</p>
          <p className="text-sm text-muted-foreground">
            {t("reading.grammar.quiz.pointsFormat", { earned: earnedPoints, total: totalPoints })}
          </p>
        </div>
        <div className={cn("transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", config.badgeBg)}>
            <TierIcon className="h-3.5 w-3.5" />
            {t(`reading.grammar.quiz.resultTier.${tier}`)}
          </span>
        </div>
        {tier === "master" && (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />
        )}
      </div>
      <div className={cn("border rounded-lg p-4 space-y-2 transition-all duration-500 [transition-delay:400ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        {topicBreakdown}
      </div>
      <div className={cn("flex gap-2 transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <Button variant="outline" size="sm" onClick={onReview}>
          {showReview ? t("reading.grammar.quiz.hideReview") : t("reading.grammar.quiz.reviewAnswers")}
        </Button>
        <Button variant="default" size="sm" onClick={onRetry}>
          <Flame className="h-3.5 w-3.5 mr-1" />
          {t("reading.grammar.quiz.retry")}
        </Button>
      </div>
    </div>
  );
}

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
  A1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  A2: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  B1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  B2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  C1: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  C2: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// Normalizes an answer string for client-side comparison: lowercase, trim, strip
// punctuation and extra whitespace, strip a leading "A)/B)/..." option marker.
function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^[a-d]\)\s*/, "")
    .replace(/[.,!?;:'"\u201c\u201d\u2018\u2019]/g, "")
    .replace(/\s+/g, " ");
}

function matchesAcceptable(userAnswer: string, acceptable: string[]): boolean {
  const norm = normalizeAnswer(userAnswer);
  if (!norm) return false;
  return acceptable.some((a) => normalizeAnswer(a) === norm);
}

// A practice item is "multi-part" when the student must supply more than one
// answer part. We detect this two ways so it works even if the AI omits commas:
//   1. The answer contains a comma (e.g. "had not watered, would die"), OR
//   2. The prompt itself shows 2+ blank markers (___), e.g.
//      "___ ___ not easy _____ understand this lesson."
// Rewrite/transformation answers are single full sentences that may contain
// commas naturally, so they always use the default placeholder.
function isMultiPartAnswer(item: GrammarGuidedPracticeItem): boolean {
  if (item.type !== "fill-in") return false;
  if (item.acceptableAnswers.some((a) => a.includes(","))) return true;
  const blankCount = (item.prompt.match(/_{2,}/g) || []).length;
  return blankCount >= 2;
}

/** One enriched grammar lesson inside an accordion item. Holds its own CCQ/practice state. */
function GrammarLessonItem({
  topic,
  isLoading,
  onLoadLesson,
  onHighlight,
  highlightActive,
  evaluatePracticeItem,
}: {
  topic: GrammarTopic;
  isLoading: boolean;
  onLoadLesson: () => void;
  onHighlight: () => void;
  highlightActive: boolean;
  evaluatePracticeItem: (item: GrammarGuidedPracticeItem, userAnswer: string) => Promise<{ correct: boolean; feedback: string }>;
}) {
  const { t } = useTranslation();
  const [revealedCcqs, setRevealedCcqs] = useState<Set<number>>(new Set());
  // Per-item-index state for the Quick Practice section. Answers are evaluated
  // exclusively by the AI (client-side checking removed), because some practice
  // answers are too complex for reliable normalized string comparison.
  const [practiceInputs, setPracticeInputs] = useState<Record<number, string>>({});
  const [practiceResults, setPracticeResults] = useState<Record<number, { correct: boolean; feedback?: string; loading?: boolean }>>({});

  const isEnriched = !!(topic.whenToUse || topic.forms || topic.signalWords || topic.compareWith || topic.ccqs || topic.guidedPractice);

  const toggleCcq = (i: number) => {
    setRevealedCcqs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleCheck = async (item: GrammarGuidedPracticeItem, index: number) => {
    const answer = practiceInputs[index] || "";
    setPracticeResults((prev) => ({ ...prev, [index]: { correct: false, loading: true } }));
    const result = await evaluatePracticeItem(item, answer);
    setPracticeResults((prev) => ({ ...prev, [index]: { correct: result.correct, feedback: result.feedback, loading: false } }));
  };

  const resetPracticeItem = (index: number) => {
    setPracticeInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setPracticeResults((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* ── Basic content (always shown) ── */}
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
            <div key={`ex-${i}`} className="bg-muted text-sm px-3 py-2 rounded">
              <p className="italic">&ldquo;{ex.sentence}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1">{t("reading.grammar.example")}</p>
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

      {/* ── Full Lesson trigger ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={isEnriched ? "outline" : "default"} size="sm" onClick={onLoadLesson} disabled={isLoading}>
          {isLoading ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>{t("reading.grammar.lesson.generatingWait").split("...")[0]}…</span>
            </>
          ) : isEnriched ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("reading.grammar.lesson.reloadLesson")}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("reading.grammar.lesson.loadFullLesson")}</span>
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={onHighlight}>
          <Highlighter className="h-3 w-3 mr-1" />
          {highlightActive ? t("reading.grammar.hideHighlight") : t("reading.grammar.showHighlight")}
        </Button>
      </div>

      {/* ── Enriched sections (only when the lesson has been loaded) ── */}
      {isEnriched && !isLoading && (
        <div className="space-y-4 border-t pt-4 mt-2">
          {/* When to Use + Signal Words */}
          {topic.whenToUse && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {t("reading.grammar.lesson.whenToUse")}
              </h5>
              <p className="text-sm text-muted-foreground">{topic.whenToUse}</p>
              {topic.whenToUseZh && (
                <p className="text-sm text-muted-foreground font-noto-sans-tc mt-1">{topic.whenToUseZh}</p>
              )}
              {topic.signalWords && topic.signalWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {t("reading.grammar.lesson.signalWords")}:
                  </span>
                  {topic.signalWords.map((w, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 font-medium">
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Forms table */}
          {topic.forms && (
            <div>
              <h5 className="font-medium text-sm mb-1">{t("reading.grammar.lesson.forms")}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="border rounded p-2">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t("reading.grammar.lesson.affirmative")}</p>
                  <p className="text-xs font-mono text-muted-foreground">{topic.forms.affirmative}</p>
                </div>
                <div className="border rounded p-2">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t("reading.grammar.lesson.negative")}</p>
                  <p className="text-xs font-mono text-muted-foreground">{topic.forms.negative}</p>
                </div>
                <div className="border rounded p-2">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">{t("reading.grammar.lesson.question")}</p>
                  <p className="text-xs font-mono text-muted-foreground">{topic.forms.question}</p>
                </div>
              </div>
            </div>
          )}

          {/* Compare With */}
          {topic.compareWith && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <GitCompare className="h-4 w-4 text-purple-500" />
                {t("reading.grammar.lesson.compareWith")}: <span className="text-purple-600 dark:text-purple-400">{topic.compareWith.structure}</span>
              </h5>
              <div className="bg-purple-50 dark:bg-purple-950/40 border-l-2 border-purple-400 px-3 py-2 rounded text-sm">
                <p>{topic.compareWith.difference}</p>
                {topic.compareWith.differenceZh && (
                  <p className="font-noto-sans-tc mt-1 text-muted-foreground">{topic.compareWith.differenceZh}</p>
                )}
                {topic.compareWith.example && (
                  <p className="italic mt-2 text-foreground">&ldquo;{topic.compareWith.example}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {/* Pronunciation Tips */}
          {topic.pronunciationTips && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-cyan-500" />
                {t("reading.grammar.lesson.pronunciationTips")}
              </h5>
              <div className="bg-cyan-50 dark:bg-cyan-950/40 px-3 py-2 rounded text-sm text-muted-foreground">
                {topic.pronunciationTips}
              </div>
            </div>
          )}

          {/* Common Mistake Pairs (wrong → right) */}
          {topic.commonMistakePairs && topic.commonMistakePairs.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <TriangleAlert className="h-4 w-4 text-rose-500" />
                {t("reading.grammar.lesson.mistakePairs")}
              </h5>
              <div className="space-y-2">
                {topic.commonMistakePairs.map((pair, i) => (
                  <div key={i} className="border rounded overflow-hidden text-sm">
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/50 px-3 py-2">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 shrink-0 mt-0.5">{t("reading.grammar.lesson.wrong")}</span>
                      <span className="line-through text-muted-foreground">{pair.wrong}</span>
                    </div>
                    <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/50 px-3 py-2">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0 mt-0.5">{t("reading.grammar.lesson.right")}</span>
                      <span className="text-foreground">{pair.right}</span>
                    </div>
                    <p className="px-3 py-1.5 text-xs text-muted-foreground border-t">{pair.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CCQs — Check Your Understanding */}
          {topic.ccqs && topic.ccqs.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-indigo-500" />
                {t("reading.grammar.lesson.ccqTitle")}
              </h5>
              <div className="space-y-2">
                {topic.ccqs.map((ccq, i) => (
                  <div key={i} className="border rounded px-3 py-2 text-sm">
                    <p className="font-medium">{ccq.question}</p>
                    {revealedCcqs.has(i) ? (
                      <p className="mt-1 text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {ccq.answer}
                      </p>
                    ) : (
                      <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => toggleCcq(i)}>
                        <Lightbulb className="h-3 w-3 mr-1" />
                        {t("reading.grammar.lesson.ccqReveal")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Practice */}
          {topic.guidedPractice && topic.guidedPractice.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-teal-500" />
                {t("reading.grammar.lesson.practiceTitle")}
              </h5>
              <p className="text-xs text-muted-foreground mb-2">{t("reading.grammar.lesson.practiceHint")}</p>
              <div className="space-y-3">
                {topic.guidedPractice.map((item, index) => {
                  const result = practiceResults[index];
                  const isResolved = !!result && !result.loading;
                  return (
                    <div key={index} className="border rounded p-3 text-sm">
                      <p className="font-medium mb-2">{item.prompt}</p>
                      {item.type === "choice" && item.options ? (
                        <RadioGroup
                          value={practiceInputs[index] || ""}
                          onValueChange={(val) => setPracticeInputs((prev) => ({ ...prev, [index]: val }))}
                          disabled={!!result}
                        >
                          {item.options.map((opt, oi) => {
                            const isCorrectOpt = isResolved && matchesAcceptable(opt, item.acceptableAnswers);
                            return (
                              <div key={oi} className="flex items-center gap-2 mb-1.5">
                                <RadioGroupItem value={opt} id={`gp-${topic.id}-${index}-${oi}`} />
                                <Label
                                  htmlFor={`gp-${topic.id}-${index}-${oi}`}
                                  className={cn(
                                    "text-sm font-normal cursor-pointer",
                                    isCorrectOpt && "text-green-600 dark:text-green-400 font-medium"
                                  )}
                                >
                                  {opt}
                                </Label>
                                {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              </div>
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <Input
                          placeholder={isMultiPartAnswer(item)
                            ? t("reading.grammar.lesson.practiceTypeAnswerMulti")
                            : t("reading.grammar.quiz.typeAnswer")}
                          value={practiceInputs[index] || ""}
                          onChange={(e) => setPracticeInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                          disabled={!!result}
                          className="text-sm"
                        />
                      )}

                      {/* AI result feedback */}
                      {isResolved && (
                        <div className={cn(
                          "mt-2 rounded px-2 py-1.5 text-xs",
                          result.correct
                            ? "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300"
                            : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                        )}>
                          <p className="font-medium flex items-center gap-1.5">
                            {result.correct ? (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> {t("reading.grammar.lesson.practiceCorrect")}</>
                            ) : (
                              <><XCircle className="h-3.5 w-3.5" /> {t("reading.grammar.lesson.practiceIncorrect")}</>
                            )}
                          </p>
                          {result.feedback && <p className="mt-0.5">{result.feedback}</p>}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-2">
                        {!isResolved && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleCheck(item, index)}
                            disabled={result?.loading || !(practiceInputs[index] || "").trim()}
                          >
                            {result?.loading ? (
                              <><LoaderCircle className="h-3 w-3 mr-1 animate-spin" /> {t("reading.grammar.lesson.practiceAiThinking")}</>
                            ) : (
                              <><Sparkles className="h-3 w-3 mr-1" /> {t("reading.grammar.lesson.practiceSubmit")}</>
                            )}
                          </Button>
                        )}
                        {isResolved && (
                          <Button size="sm" variant="ghost" onClick={() => resetPracticeItem(index)}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t("reading.grammar.lesson.practiceTryAgain")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Grammar() {
  const { t } = useTranslation();
  const {
    extractedText,
    docTitle,
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
    grammarQuizMode,
    setGrammarQuizMode,
  } = useReadingStore();
  const { activeGenerations, analyzeGrammarTopics, generateGrammarLesson, evaluateGrammarPracticeItem, generateGrammarQuiz, calculateGrammarQuizScore, evaluateGrammarOpenAnswer } = useReadingAssistant();
  const { data: session } = useSession();
  const isTeacherOrAbove = session?.user?.role === "teacher" || session?.user?.role === "admin" || session?.user?.role === "super-admin";

  const [activeTab, setActiveTab] = useState<TabType>("topics");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<GrammarQuizState>("idle");
  const [showReview, setShowReview] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [exportSections, setExportSections] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const isAnalyzing = !!activeGenerations["grammar-topics"];
  const isGeneratingQuiz = !!activeGenerations["grammar-quiz"];

  const handleAnalyze = useCallback(async () => {
    await analyzeGrammarTopics();
  }, [analyzeGrammarTopics]);

  const handleGenerateQuiz = useCallback(async () => {
    await generateGrammarQuiz();
  }, [generateGrammarQuiz]);

  const handleStartQuiz = useCallback(() => {
    setQuizState("in-progress");
    setShowReview(false);
    setCurrentQuestionIndex(0);
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
    setCurrentQuestionIndex(0);
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

  const toggleExportSection = useCallback((section: string, checked: boolean | "indeterminate") => {
    setExportSections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(section);
      else next.delete(section);
      return next;
    });
  }, []);

  const downloadWord = useCallback(async () => {
    if (exportSections.size === 0) return;

    const title = docTitle || extractedText.split(/\n/).find((l) => l.trim()) || "Grammar";
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
            text: `${t("reading.grammar.title")} - Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`,
            italics: true,
            color: "595959",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (exportSections.has("topics")) {
      children.push(
        new Paragraph({
          text: t("reading.grammar.tabTopics"),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      grammarTopics.forEach((topic, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${topic.name}`, bold: true }),
              new TextRun({ text: `  (${topic.nameZh})`, color: "666666" }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${topic.cefrLevel}] [${topic.category}]`, color: "666666", size: 20 }),
            ],
            spacing: { after: 100 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: t("reading.grammar.whatIsIt") + ": ", bold: true }),
              new TextRun({ text: topic.explanation }),
            ],
            spacing: { after: 80 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: t("reading.grammar.pattern") + ": ", bold: true }),
              new TextRun({ text: topic.pattern, font: "Courier New" }),
            ],
            spacing: { after: 80 },
          })
        );

        if (topic.occurrences > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${topic.occurrences}x in text`, color: "666666", size: 20 }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      });
    }

    if (exportSections.has("lessons")) {
      children.push(
        new Paragraph({
          text: t("reading.grammar.tabLessons"),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      grammarTopics.forEach((topic, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${topic.name}`, bold: true }),
              new TextRun({ text: `  (${topic.nameZh})`, color: "666666" }),
              new TextRun({ text: `  [${topic.cefrLevel}]`, color: topic.cefrLevel.startsWith("A") ? "22C55E" : topic.cefrLevel.startsWith("B") ? "F59E0B" : "EF4444" }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: t("reading.grammar.whatIsIt"), bold: true }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );
        children.push(
          new Paragraph({ children: [new TextRun({ text: topic.explanation })], spacing: { after: 40 } })
        );
        children.push(
          new Paragraph({ children: [new TextRun({ text: topic.explanationZh, color: "666666" })], spacing: { after: 80 } })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: t("reading.grammar.pattern"), bold: true }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );
        children.push(
          new Paragraph({ children: [new TextRun({ text: topic.pattern, font: "Courier New" })], spacing: { after: 80 } })
        );

        if (topic.textSentences.length > 0 || topic.examples.filter((ex) => ex.source !== "text").length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: t("reading.grammar.examples"), bold: true }),
              ],
              spacing: { before: 100, after: 40 },
            })
          );

          topic.textSentences.forEach((s) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `\u201C${s}\u201D`, italics: true }),
                  new TextRun({ text: ` (${t("reading.grammar.fromThisText")})`, color: "666666", size: 20 }),
                ],
                spacing: { after: 40 },
              })
            );
          });

          topic.examples.filter((ex) => ex.source !== "text").forEach((ex) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `\u201C${ex.sentence}\u201D`, italics: true }),
                ],
                spacing: { after: 40 },
              })
            );
          });
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: t("reading.grammar.commonMistakes"), bold: true }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );
        children.push(
          new Paragraph({ children: [new TextRun({ text: topic.commonMistakes })], spacing: { after: 40 } })
        );
        children.push(
          new Paragraph({ children: [new TextRun({ text: topic.commonMistakesZh, color: "666666" })], spacing: { after: 80 } })
        );

        // ── Enriched lesson content (only when "Load Full Lesson" has run for this topic) ──
        if (topic.whenToUse) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.whenToUse"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          children.push(new Paragraph({ children: [new TextRun({ text: topic.whenToUse })], spacing: { after: 40 } }));
          children.push(new Paragraph({ children: [new TextRun({ text: topic.whenToUseZh, color: "666666" })], spacing: { after: 40 } }));
          if (topic.signalWords && topic.signalWords.length > 0) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${t("reading.grammar.lesson.signalWords")}: `, bold: true }),
                  new TextRun({ text: topic.signalWords.join(", ") }),
                ],
                spacing: { after: 80 },
              })
            );
          }
        }

        if (topic.forms) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.forms"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.grammar.lesson.affirmative")}: `, bold: true }),
              new TextRun({ text: topic.forms.affirmative }),
            ],
            spacing: { after: 40 },
          }));
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.grammar.lesson.negative")}: `, bold: true }),
              new TextRun({ text: topic.forms.negative }),
            ],
            spacing: { after: 40 },
          }));
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.grammar.lesson.question")}: `, bold: true }),
              new TextRun({ text: topic.forms.question }),
            ],
            spacing: { after: 80 },
          }));
        }

        if (topic.compareWith) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.lesson.compareWith")}: `, bold: true }),
                new TextRun({ text: topic.compareWith.structure }),
              ],
              spacing: { before: 120, after: 40 },
            })
          );
          children.push(new Paragraph({ children: [new TextRun({ text: topic.compareWith.difference })], spacing: { after: 40 } }));
          if (topic.compareWith.differenceZh) {
            children.push(new Paragraph({ children: [new TextRun({ text: topic.compareWith.differenceZh, color: "666666" })], spacing: { after: 40 } }));
          }
          if (topic.compareWith.example) {
            children.push(new Paragraph({ children: [new TextRun({ text: `\u201C${topic.compareWith.example}\u201D`, italics: true })], spacing: { after: 80 } }));
          }
        }

        if (topic.pronunciationTips) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.pronunciationTips"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          children.push(new Paragraph({ children: [new TextRun({ text: topic.pronunciationTips })], spacing: { after: 80 } }));
        }

        if (topic.commonMistakePairs && topic.commonMistakePairs.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.mistakePairs"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          topic.commonMistakePairs.forEach((pair) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.lesson.wrong")}: `, bold: true, color: "EF4444" }),
                new TextRun({ text: pair.wrong, color: "EF4444" }),
              ],
              spacing: { after: 20 },
            }));
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.lesson.right")}: `, bold: true, color: "22C55E" }),
                new TextRun({ text: pair.right, color: "22C55E" }),
              ],
              spacing: { after: 20 },
            }));
            children.push(new Paragraph({ children: [new TextRun({ text: pair.explanation, italics: true, size: 20 })], spacing: { after: 60 } }));
          });
        }

        if (topic.ccqs && topic.ccqs.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.ccqTitle"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          topic.ccqs.forEach((ccq, ci) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${ci + 1}. ${ccq.question} `, }),
                new TextRun({ text: ccq.answer, bold: true, color: "22C55E" }),
              ],
              spacing: { after: 40 },
            }));
          });
        }

        if (topic.guidedPractice && topic.guidedPractice.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t("reading.grammar.lesson.practiceTitle"), bold: true })],
              spacing: { before: 120, after: 40 },
            })
          );
          topic.guidedPractice.forEach((item, pi) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${pi + 1}. ` }),
                ...questionToTextRuns(item.prompt),
              ],
              spacing: { after: 40 },
            }));
            if (item.options) {
              item.options.forEach((opt) => {
                children.push(new Paragraph({ children: [new TextRun({ text: `   \u25EF ${opt}` })], spacing: { after: 20 } }));
              });
            }
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.quiz.correctAnswer")}: `, bold: true }),
                new TextRun({ text: item.acceptableAnswers[0] || "", color: "22C55E" }),
              ],
              spacing: { after: 20 },
            }));
            children.push(new Paragraph({ children: [new TextRun({ text: item.explanation, italics: true, size: 20 })], spacing: { after: 80 } }));
          });
        }

        children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 200 } }));
      });
    }

    const hasQuizBlank = exportSections.has("quiz-blank");
    const hasQuizAnswers = exportSections.has("quiz-answers");

    if ((hasQuizBlank || hasQuizAnswers) && grammarQuiz.length > 0) {
      children.push(
        new Paragraph({
          text: t("reading.grammar.tabQuiz"),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      if (hasQuizAnswers && _grammarQuizCompleted && grammarQuizScore > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.grammar.quiz.lastScore")} ${grammarQuizScore}%  (${t("reading.grammar.quiz.pointsFormat", { earned: grammarQuizEarnedPoints, total: grammarQuizTotalPoints })})`, color: "666666" }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      if (hasQuizBlank) {
        children.push(
          new Paragraph({
            text: t("reading.grammar.exportQuizBlank"),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );

        grammarQuiz.forEach((q, index) => {
          const typeLabel = t(`reading.grammar.quiz.types.${q.type}`);

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ` }),
                ...questionToTextRuns(q.question),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 80 },
            })
          );

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${typeLabel}] [${q.topicName}]`, color: "666666", size: 20 }),
              ],
              spacing: { after: 80 },
            })
          );

          if (q.options) {
            q.options.forEach((opt) => {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `   \u25EF ${opt}` }),
                  ],
                  spacing: { after: 50 },
                })
              );
            });
          } else {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `   ${t("reading.grammar.quiz.typeAnswer")}`, italics: true, color: "888888" }),
                ],
                spacing: { after: 100 },
              })
            );
          }
        });
      }

      if (hasQuizAnswers) {
        children.push(
          new Paragraph({
            text: t("reading.grammar.exportQuizAnswerKey"),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );

        grammarQuiz.forEach((q, index) => {
          const typeLabel = t(`reading.grammar.quiz.types.${q.type}`);

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ` }),
                ...questionToTextRuns(q.question),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 80 },
            })
          );

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${typeLabel}] [${q.topicName}]`, color: "666666", size: 20 }),
              ],
              spacing: { after: 80 },
            })
          );

          if (q.options) {
            q.options.forEach((opt) => {
              const optLetter = opt.charAt(0).toUpperCase();
              const isCorrect = optLetter === q.correctAnswer.toUpperCase().trim().charAt(0);
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `   \u25EF ${opt}`,
                      bold: isCorrect,
                      color: isCorrect ? "22C55E" : "000000",
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            });
          } else {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `   ${t("reading.grammar.quiz.typeAnswer")}`, italics: true, color: "888888" }),
                ],
                spacing: { after: 100 },
              })
            );
          }

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.quiz.correctAnswer")}: `, bold: true }),
                new TextRun({ text: q.correctAnswer, color: "22C55E" }),
              ],
              spacing: { before: 100, after: 80 },
            })
          );

          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.grammar.quiz.reviewAnswers")}: `, bold: true }),
                new TextRun({ text: q.explanation }),
              ],
              spacing: { after: 80 },
            })
          );

          if (q.explanationZh) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: q.explanationZh, color: "666666" }),
                ],
                spacing: { after: 200 },
              })
            );
          }
        });
      }
    }

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
      saveAs(blob, `${safeFileName} - Grammar.docx`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [exportSections, grammarTopics, grammarQuiz, grammarQuizScore, grammarQuizEarnedPoints, grammarQuizTotalPoints, _grammarQuizCompleted, extractedText, docTitle, t]);

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
              {topic.whenToUse && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  {t("reading.grammar.lesson.loadedHint")}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <GrammarLessonItem
              topic={topic}
              isLoading={!!activeGenerations[`grammar-lesson:${topic.id}`]}
              onLoadLesson={() => generateGrammarLesson(topic.id)}
              onHighlight={() => handleHighlightTopic(topic.id)}
              highlightActive={grammarHighlightEnabled && grammarHighlightTopicId === topic.id}
              evaluatePracticeItem={evaluateGrammarPracticeItem}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  const goToNext = () => {
    if (currentQuestionIndex < grammarQuiz.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const renderQuizContent = () => {
    if (quizState === "idle") {
      if (grammarQuiz.length === 0) {
        return (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t("reading.grammar.quiz.ready", { count: 0 })}
            </p>
            <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || isAnalyzing}>
              {isGeneratingQuiz ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>{t("reading.grammar.quiz.generating")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("reading.grammar.quiz.generate")}</span>
                </>
              )}
            </Button>
          </div>
        );
      }
      return (
        <div className="text-center py-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <p className="font-medium">{t("reading.grammar.quiz.questionByQuestion")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("reading.grammar.quiz.modeDesc")}</p>
            </div>
            <Switch
              checked={grammarQuizMode === "question-by-question"}
              onCheckedChange={(checked: boolean) => setGrammarQuizMode(checked ? "question-by-question" : "all-at-once")}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {t("reading.grammar.quiz.ready", { count: grammarQuiz.length })}
          </p>
          <Button onClick={handleStartQuiz} size="lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
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
      const scoreMessage =
        grammarQuizScore >= 80
          ? t("reading.grammar.quiz.excellent")
          : grammarQuizScore >= 60
            ? t("reading.grammar.quiz.good")
            : t("reading.grammar.quiz.keepPracticing");

      return (
        <>
          <QuizResultScreen
            score={grammarQuizScore}
            earnedPoints={grammarQuizEarnedPoints}
            totalPoints={grammarQuizTotalPoints}
            scoreMessage={scoreMessage}
            showReview={showReview}
            onReview={() => setShowReview(!showReview)}
            onRetry={handleRetry}
            topicBreakdown={
              <>
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
              </>
            }
          />
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
                          {i + 1}. {renderFormattedText(q.question)}
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
        </>
      );
    }

    const allAnswered = grammarQuiz.every((q) => q.userAnswer?.trim());

    const renderQuestion = (q: GrammarQuizQuestion, i: number) => (
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
          {i + 1}. {renderFormattedText(q.question)}
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
    );

    if (grammarQuizMode === "question-by-question") {
      const currentQuestion = grammarQuiz[currentQuestionIndex];
      const currentAnswer = currentQuestion?.userAnswer;

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {t("reading.grammar.quiz.question")} {currentQuestionIndex + 1}{" "}
                {t("reading.grammar.quiz.of")} {grammarQuiz.length}
              </span>
              <span>
                {t("reading.grammar.quiz.pressKey")} →/←
              </span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / grammarQuiz.length) * 100} className="h-2" />
          </div>

          {currentQuestion && renderQuestion(currentQuestion, currentQuestionIndex)}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("reading.grammar.quiz.previous")}
            </Button>

            {currentQuestionIndex === grammarQuiz.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={!allAnswered || evaluatingId !== null}
              >
                {evaluatingId ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                    {t("reading.grammar.quiz.evaluating")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("reading.grammar.quiz.submit")}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goToNext} disabled={!currentAnswer}>
                {t("reading.grammar.quiz.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("reading.grammar.quiz.questionsReady", { count: grammarQuiz.length })}
        </p>

        <div className="space-y-4">
          {grammarQuiz.map((q, i) => renderQuestion(q, i))}
        </div>

        <div className="flex justify-center">
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
          <GuideDialog
            titleKey="reading.grammar.help.title"
            introKey="reading.grammar.help.intro"
            itemsBaseKey="reading.grammar.help.items"
            items={[
              { key: "topics", icon: BookOpenCheck, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "lessons", icon: GraduationCap, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
              { key: "games", icon: Gamepad2, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
              { key: "quiz", icon: ClipboardList, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
              { key: "highlight", icon: Highlighter, bgClass: "bg-yellow-500/10", iconClass: "text-yellow-500" },
            ]}
            stepsTitleKey="reading.grammar.help.stepsTitle"
            stepsKeys={[
              "reading.grammar.help.steps.s1",
              "reading.grammar.help.steps.s2",
              "reading.grammar.help.steps.s3",
              "reading.grammar.help.steps.s4",
            ]}
            tipTitleKey="reading.grammar.help.tipTitle"
            tipContentKey="reading.grammar.help.tipContent"
          />
        </h3>
        <div className="flex flex-wrap justify-end gap-2 ml-auto">
          {grammarTopics.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("reading.grammar.downloadWord")}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={exportSections.has("topics")}
                  onCheckedChange={(checked) => toggleExportSection("topics", checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t("reading.grammar.tabTopics")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={exportSections.has("lessons")}
                  onCheckedChange={(checked) => toggleExportSection("lessons", checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t("reading.grammar.tabLessons")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={exportSections.has("quiz-blank")}
                  onCheckedChange={(checked) => toggleExportSection("quiz-blank", checked)}
                  onSelect={(e) => e.preventDefault()}
                  disabled={grammarQuiz.length === 0}
                >
                  {t("reading.grammar.exportQuizBlank")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={exportSections.has("quiz-answers")}
                  onCheckedChange={(checked) => toggleExportSection("quiz-answers", checked)}
                  onSelect={(e) => e.preventDefault()}
                  disabled={grammarQuiz.length === 0 || (!_grammarQuizCompleted && !isTeacherOrAbove)}
                >
                  {t("reading.grammar.exportQuizAnswerKey")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={exportSections.size === 0}
                  onClick={() => downloadWord()}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  {t("reading.grammar.exportDownload")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                {isGeneratingQuiz
                  ? t("reading.grammar.quiz.generating")
                  : grammarQuiz.length > 0
                    ? t("reading.grammar.quiz.regenerate")
                    : t("reading.grammar.quiz.generate")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {grammarTopics.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1 mb-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 sm:px-4 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
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
