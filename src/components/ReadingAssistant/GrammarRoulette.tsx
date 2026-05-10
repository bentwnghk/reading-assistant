"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, LoaderCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, GameModeSelector, AnswerFeedback, GameStatRow } from "./GrammarGames";
import { logActivity } from "@/utils/activityLogger";

// ── Wheel colours per topic slot ─────────────────────────────────────────────
const WHEEL_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouletteRound {
  topicIndex: number;
  question: GrammarGameQuestion;
  answered: boolean;
  correct: boolean;
}

interface Props { onBack: () => void }

// ── Component ─────────────────────────────────────────────────────────────────

export default function GrammarRoulette({ onBack }: Props) {
  const { t } = useTranslation();
  const {
    grammarTopics,
    grammarGameQuestions,
    grammarRouletteHighScore,
    setGrammarRouletteHighScore,
    setGrammarGameAccuracy,
    id, backup,
  } = useReadingStore();
  const { generateGrammarQuestions } = useReadingAssistant();
  const { update, save } = useHistoryStore();

  const [gameStatus, setGameStatus] = useState<GrammarGameStatus>("setup");
  const [mode, setMode] = useState<GrammarGameMode>("practice");
  const [questions, setQuestions] = useState<GrammarGameQuestion[]>([]);
  const [questionsByTopic, setQuestionsByTopic] = useState<Map<string, GrammarGameQuestion[]>>(new Map());
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds] = useState(10);
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hotTopicId, setHotTopicId] = useState<string | null>(null);
  const [hotTopicStreak, setHotTopicStreak] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [landedTopicIndex, setLandedTopicIndex] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedQuestionIds = useRef<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);

  // ── Sync store cache → local questions + byTopic map ─────────────────────
  useEffect(() => {
    if (grammarGameQuestions.length > 0) {
      setQuestions(grammarGameQuestions);
      const byTopic = new Map<string, GrammarGameQuestion[]>();
      for (const topic of grammarTopics) {
        byTopic.set(topic.id, grammarGameQuestions.filter((q) => q.topicId === topic.id));
      }
      setQuestionsByTopic(byTopic);
    }
  }, [grammarGameQuestions, grammarTopics]);

  // ── Auto-generate on first entry if cache is empty ───────────────────────
  useEffect(() => {
    if (grammarGameQuestions.length === 0 && grammarTopics.length > 0) {
      setIsAutoGenerating(true);
      const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
      generateGrammarQuestions().finally(() => { setIsAutoGenerating(false); toast.dismiss(tid); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown timer (Arcade / Mastery mode) ──────────────────────────────
  useEffect(() => {
    if (gameStatus !== "playing" || mode === "practice" || !currentRound || currentRound.answered || isSpinning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCurrentRound((r) => r ? { ...r, answered: true, correct: false } : r);
          setStreak(0);
          setTimeout(() => {
            setRoundIndex((ri) => {
              const nextRound = ri + 1;
              if (nextRound >= totalRounds) {
                setGameStatus("completed");
                return ri;
              }
              setCurrentRound(null);
              setSelectedOption(null);
              return nextRound;
            });
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, mode, roundIndex, isSpinning, currentRound?.answered]);

  const getQuestionForTopic = useCallback((topicId: string): GrammarGameQuestion | null => {
    const pool = (questionsByTopic.get(topicId) ?? []).filter((q) => {
      const key = `${q.topicId}-${q.question}`;
      return !usedQuestionIds.current.has(key);
    });
    if (pool.length === 0) return null;
    const q = pool[Math.floor(Math.random() * pool.length)];
    usedQuestionIds.current.add(`${q.topicId}-${q.question}`);
    return q;
  }, [questionsByTopic]);

  const spinWheel = useCallback(() => {
    if (isSpinning || grammarTopics.length === 0) return;
    setIsSpinning(true);
    setCurrentRound(null);
    setSelectedOption(null);

    const targetIndex = Math.floor(Math.random() * grammarTopics.length);
    const sliceDeg = 360 / grammarTopics.length;
    // Align the fixed top pointer with the CENTER of the target slice.
    // CSS rotate(θ) moves a point at original screen-angle α to α+θ.
    // So the pointer (at 0°) aligns with original angle = –θ (mod 360°).
    // Center of slice i = i*sliceDeg + sliceDeg/2.
    // We need: -(wheelRotation % 360) ≡ targetIndex*sliceDeg + sliceDeg/2
    // i.e. desiredMod = (360 – targetIndex*sliceDeg – sliceDeg/2 + 360) % 360
    const desiredMod = (720 - targetIndex * sliceDeg - sliceDeg / 2) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    let delta = (desiredMod - currentMod + 360) % 360;
    if (delta === 0) delta = 360; // always rotate forward at least one full turn
    const extraSpins = 5 + Math.floor(Math.random() * 6); // 5–10 extra full integer rotations
    const newRotation = wheelRotation + extraSpins * 360 + delta;

    setWheelRotation(newRotation);
    setLandedTopicIndex(targetIndex);

    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      const topic = grammarTopics[targetIndex];
      const q = getQuestionForTopic(topic.id);
      if (q) {
        setCurrentRound({ topicIndex: targetIndex, question: q, answered: false, correct: false });
      } else {
        // All questions for this topic used — pick any remaining
        const remaining = questions.filter((qq) => !usedQuestionIds.current.has(`${qq.topicId}-${qq.question}`));
        if (remaining.length > 0) {
          const q2 = remaining[Math.floor(Math.random() * remaining.length)];
          usedQuestionIds.current.add(`${q2.topicId}-${q2.question}`);
          setCurrentRound({ topicIndex: targetIndex, question: q2, answered: false, correct: false });
        }
      }
    }, 3000);
  }, [isSpinning, grammarTopics, wheelRotation, getQuestionForTopic, questions]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (!currentRound || currentRound.answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOption(optIdx);

    const isCorrect = optIdx === currentRound.question.correctIndex;
    const topic = grammarTopics[currentRound.topicIndex];

    const newStreak = isCorrect ? streak + 1 : 0;

    if (isCorrect) {
      // Hot Topic bonus (3+ correct in a row on same topic)
      const newHotStreak = topic.id === hotTopicId ? hotTopicStreak + 1 : 1;
      setHotTopicId(topic.id);
      setHotTopicStreak(newHotStreak);
      const multiplier = newHotStreak >= 3 ? 3 : newHotStreak >= 2 ? 2 : 1;
      let award = Math.round(100 * multiplier);
      if (mode === "arcade") award += Math.round((timeLeft / 30) * 50);
      setCoins((c) => c + award);
      setStreak(newStreak);
      setMaxStreak((ms) => Math.max(ms, newStreak));
      setCorrectCount((c) => c + 1);
    } else {
      setStreak(0);
      setHotTopicId(null);
      setHotTopicStreak(0);
    }

    setCurrentRound((r) => r ? { ...r, answered: true, correct: isCorrect } : r);

    setTimeout(() => {
      const nextRound = roundIndex + 1;
      if (nextRound >= totalRounds) {
        setGameStatus("completed");
      } else {
        setRoundIndex(nextRound);
        setCurrentRound(null);
        setSelectedOption(null);
      }
    }, 3000);
  }, [currentRound, streak, hotTopicId, hotTopicStreak, grammarTopics, roundIndex, totalRounds, mode, timeLeft]);

  const startGame = useCallback(() => {
    setRoundIndex(0);
    setCoins(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setHotTopicId(null);
    setHotTopicStreak(0);
    setCurrentRound(null);
    setSelectedOption(null);
    setWheelRotation(0);
    setLandedTopicIndex(null);
    setTimeLeft(30);
    usedQuestionIds.current = new Set();
    setGameStatus("playing");
  }, []);

  useEffect(() => {
    if (gameStatus === "completed" && totalRounds > 0) {
      const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;
      setGrammarRouletteHighScore(coins);
      setGrammarGameAccuracy(accuracy);
      logActivity("grammar_roulette_complete", { sessionId: id || undefined, score: coins, accuracy });
      const session = backup();
      const updated = update(id, session);
      if (!updated) save(session);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
    try {
      await generateGrammarQuestions();
    } finally {
      setIsGenerating(false);
      toast.dismiss(tid);
    }
  };

  // ── Wheel SVG ─────────────────────────────────────────────────────────────
  const renderWheel = () => {
    const n = grammarTopics.length;
    if (n === 0) return null;
    const sliceDeg = 360 / n;
    const R = 100;
    const cx = 110;
    const cy = 110;

    return (
      <div className="flex justify-center">
        <div className="relative w-[220px] h-[220px]">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
            style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "20px solid hsl(var(--primary))" }}
          />
          <svg
            width="220"
            height="220"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning ? "transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)" : "none",
            }}
          >
            {grammarTopics.map((topic, i) => {
              const startAngle = (i * sliceDeg - 90) * (Math.PI / 180);
              const endAngle = ((i + 1) * sliceDeg - 90) * (Math.PI / 180);
              const x1 = cx + R * Math.cos(startAngle);
              const y1 = cy + R * Math.sin(startAngle);
              const x2 = cx + R * Math.cos(endAngle);
              const y2 = cy + R * Math.sin(endAngle);
              const largeArc = sliceDeg > 180 ? 1 : 0;
              const midAngle = ((i + 0.5) * sliceDeg - 90) * (Math.PI / 180);
              const tx = cx + (R * 0.65) * Math.cos(midAngle);
              const ty = cy + (R * 0.65) * Math.sin(midAngle);
              const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
              const isLanded = landedTopicIndex === i;

              return (
                <g key={topic.id}>
                  <path
                    d={`M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    opacity={isLanded && !isSpinning ? 1 : 0.85}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={n > 6 ? "7" : "9"}
                    fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {topic.name.length > 12 ? topic.name.slice(0, 10) + "…" : topic.name}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r="14" fill="white" stroke="hsl(var(--border))" strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  };

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (gameStatus === "setup") {
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="space-y-1">
          <h3 className="font-bold text-base">{t("reading.grammar.games.roulette.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("reading.grammar.games.roulette.description")}</p>
        </div>
        {isAutoGenerating ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center">{t("reading.grammar.games.generating")}</p>
          </div>
        ) : (
          <>
            <GameModeSelector mode={mode} onChange={setMode} />
            {renderWheel()}
            <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
              <span>{totalRounds} {t("reading.grammar.games.roundsLabel")}</span>
              {grammarRouletteHighScore > 0 && (
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  🏆 {grammarRouletteHighScore} {t("reading.grammar.games.roulette.coinsUnit")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={startGame} className="flex-1" disabled={questions.length === 0 || isGenerating}>
                {t("reading.grammar.games.start")}
              </Button>
              <Button variant="outline" onClick={handleGenerateNew} disabled={isGenerating}>
                {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (gameStatus === "completed") {
    const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;
    const isNewHigh = coins > grammarRouletteHighScore;
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="text-center space-y-2 py-4">
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-7 w-7 text-amber-500" />
            <div className="text-5xl font-black text-amber-500">{coins}</div>
          </div>
          <div className="text-sm text-muted-foreground">{t("reading.grammar.games.roulette.coins", { count: coins })}</div>
          {isNewHigh && <Badge className="bg-amber-500 text-white">🏆 {t("reading.grammar.games.newBest")}</Badge>}
        </div>
        <div className="border rounded-lg divide-y">
          <GameStatRow label={t("reading.grammar.games.accuracy")} value={`${accuracy}%`} highlight />
          <GameStatRow label={t("reading.grammar.games.streak")} value={maxStreak} />
          <GameStatRow label={t("reading.grammar.games.rounds", { count: totalRounds })} value={`${correctCount}/${totalRounds}`} />
        </div>
        <div className="flex gap-2">
          <Button onClick={startGame} className="flex-1" disabled={isGenerating}>{t("reading.grammar.games.playAgain")}</Button>
          <Button variant="outline" onClick={handleGenerateNew} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{t("reading.grammar.games.generateChallenges")}</span>
          </Button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const landedTopic = landedTopicIndex !== null ? grammarTopics[landedTopicIndex] : null;
  const hotMultiplier = hotTopicStreak >= 3 ? 3 : hotTopicStreak >= 2 ? 2 : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <GameBackButton onBack={onBack} />
        <div className="flex items-center gap-3">
          {hotTopicStreak >= 2 && (
            <Badge className="bg-orange-500 text-white text-xs">
              🔥 {t("reading.grammar.games.roulette.streakBonus", { multiplier: hotMultiplier })}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
            <Coins className="h-4 w-4" />
            {coins}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("reading.grammar.games.rounds", { count: totalRounds })} {roundIndex + 1}/{totalRounds}</span>
        {mode !== "practice" && currentRound && !isSpinning && (
          <span className={cn(
            "font-bold tabular-nums",
            timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-muted-foreground"
          )}>
            {timeLeft}s
          </span>
        )}
      </div>

      {/* Wheel */}
      {renderWheel()}

      {/* Spin button or landed topic label */}
      {!currentRound && !isSpinning && (
        <Button onClick={spinWheel} className="w-full" size="lg">
          {t("reading.grammar.games.roulette.spin")}
        </Button>
      )}
      {isSpinning && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          {t("reading.grammar.games.roulette.spinning")}
        </div>
      )}

      {/* Question */}
      {currentRound && !isSpinning && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          {landedTopic && (
            <div
              className="px-3 py-1.5 rounded-full text-white text-xs font-semibold text-center"
              style={{ background: WHEEL_COLORS[currentRound.topicIndex % WHEEL_COLORS.length] }}
            >
              {landedTopic.name}
              {hotTopicId === landedTopic.id && hotTopicStreak >= 2 && (
                <span className="ml-2">🔥 {t("reading.grammar.games.roulette.hotTopic")}</span>
              )}
            </div>
          )}

          <div className="border rounded-xl p-4">
            <p className="text-sm font-medium mb-3">{currentRound.question.question}</p>
            <div className="space-y-2">
              {currentRound.question.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === currentRound.question.correctIndex;
                return (
                  <button
                    key={i}
                    onClick={() => !currentRound.answered && handleAnswer(i)}
                    disabled={currentRound.answered}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all",
                      currentRound.answered
                        ? isCorrect
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-medium"
                          : isSelected
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                          : "opacity-50 cursor-not-allowed border-border"
                        : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {currentRound.answered && (
            <AnswerFeedback
              isCorrect={currentRound.correct}
              explanation={currentRound.question.explanation}
              points={currentRound.correct ? (hotMultiplier > 1 ? 100 * hotMultiplier : 100) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
