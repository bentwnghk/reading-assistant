"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, GameModeSelector, AnswerFeedback } from "./GrammarGames";
import {
  PointPopup,
  AnimatedScore,
  StreakFlame,
  MilestoneBanner,
  burstConfetti,
  STREAK_MILESTONES,
  GRAMMAR_FX,
  type PointBreakdown,
} from "./GameFx";
import { logActivity } from "@/utils/activityLogger";
import { playSfx } from "@/utils/sfx";
import GameResultScreen from "./GameResultScreen";

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

/**
 * Workshop scoring, extracted verbatim from the old inline math in
 * `checkAnswer` so the breakdown (base / time / streak) can be surfaced to the
 * UI (PointPopup). Do NOT change the formula.
 */
function computeWorkshopPoints(opts: {
  arcade: boolean;
  timeLeft: number;
  /** Streak AFTER this correct answer (streak + 1). */
  newStreak: number;
}): PointBreakdown {
  let pts = 100;
  let timeBonus = 0;
  if (opts.arcade) {
    timeBonus = Math.round((opts.timeLeft / 30) * 50);
    pts += timeBonus;
  }
  let streakBonus = 0;
  if (opts.newStreak >= 3) {
    streakBonus = Math.floor(pts * 0.1 * Math.min(opts.newStreak - 2, 5));
    pts += streakBonus;
  }
  return { base: 100, timeBonus, streakBonus, hintPenalty: 0, total: pts };
}

export default function GrammarWorkshop({ onBack }: Props) {
  const { t } = useTranslation();
  const {
    grammarTopics,
    grammarWorkshopChallenges,
    activeGenerations,
    grammarWorkshopHighScore,
    grammarWorkshopAccuracy,
    setGrammarWorkshopHighScore,
    setGrammarGameAccuracy,
    id, backup,
  } = useReadingStore();
  const { generateGrammarWorkshopContent } = useReadingAssistant();
  const { update, save } = useHistoryStore();

  const [gameStatus, setGameStatus] = useState<GrammarGameStatus>("setup");
  const [mode, setMode] = useState<GrammarGameMode>("practice");
  const [challenges, setChallenges] = useState<GrammarWorkshopChallenge[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<GrammarWorkshopChallenge | null>(null);
  const [topicName, setTopicName] = useState("");
  const [filledSlots, setFilledSlots] = useState<(string | null)[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [result, setResult] = useState<"pending" | "correct" | "incorrect">("pending");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const isGenerating = !!activeGenerations["grammar-workshop"];
  const isAutoGenerating = isGenerating && challenges.length === 0;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Game-juice state (see GameFx.tsx). `seq` keys each event so the popup /
  // banner components remount (replaying their one-shot animations) per answer.
  const [lastBreakdown, setLastBreakdown] = useState<(PointBreakdown & { seq: number }) | null>(null);
  const [milestone, setMilestone] = useState<{ streak: number; seq: number } | null>(null);
  // `bestBefore` snapshots the store best at game start (the store only keeps
  // a max); the ref makes the in-game banner a one-shot per game, and the
  // snapshot freezes `isNewHigh` for the result screen (recomputing it from
  // the store would self-cancel once the completion effect raises the best).
  const [bestBefore, setBestBefore] = useState(0);
  const [newBestSeq, setNewBestSeq] = useState(0);
  const newBestFiredRef = useRef(false);
  const fxSeqRef = useRef(0);

  // ── Sync store cache → local challenges ──────────────────────────────────
  useEffect(() => {
    if (grammarWorkshopChallenges.length > 0) {
      setChallenges(grammarWorkshopChallenges);
    }
  }, [grammarWorkshopChallenges]);

  // ── Auto-generate on first entry if cache is empty ───────────────────────
  useEffect(() => {
    if (grammarWorkshopChallenges.length === 0 && grammarTopics.length > 0 && !activeGenerations["grammar-workshop"]) {
      const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
      generateGrammarWorkshopContent().finally(() => { toast.dismiss(tid); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChallenge = useCallback((index: number, list: GrammarWorkshopChallenge[]) => {
    const c = list[index];
    setCurrentChallenge(c);
    setTopicName(grammarTopics.find((t) => t.id === c.topicId)?.name ?? "");
    setFilledSlots(new Array(c.slots.length).fill(null));
    setUsedWords([]);
    setResult("pending");
    setTimeLeft(30);
  }, [grammarTopics]);

  const startGame = useCallback(() => {
    if (challenges.length === 0) return;
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setTimeLeft(30);
    setLastBreakdown(null);
    setMilestone(null);
    // Snapshot via getState() — startGame's closure would otherwise capture a
    // stale best across consecutive games.
    setBestBefore(useReadingStore.getState().grammarWorkshopHighScore);
    setNewBestSeq(0);
    newBestFiredRef.current = false;
    loadChallenge(0, challenges);
    setGameStatus("playing");
  }, [challenges, loadChallenge]);

  // ── Arcade / Mastery countdown timer ─────────────────────────────────────
  useEffect(() => {
    if (gameStatus !== "playing" || mode === "practice" || result !== "pending") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Time's up — mark as incorrect and advance
          setStreak(0);
          setResult("incorrect");
          setTimeout(() => {
            setRoundIndex((ri) => {
              const nextIndex = ri + 1;
              if (nextIndex >= challenges.length) {
                setGameStatus("completed");
                return ri;
              }
              loadChallenge(nextIndex, challenges);
              return nextIndex;
            });
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, mode, result, roundIndex]);

  const selectWord = useCallback((word: string) => {
    if (result !== "pending") return;
    setFilledSlots((prev) => {
      const nextEmpty = prev.findIndex((s) => s === null);
      if (nextEmpty === -1) return prev;
      const updated = [...prev];
      updated[nextEmpty] = word;
      setUsedWords((uw) => [...uw, word]);
      return updated;
    });
  }, [result]);

  const removeSlot = useCallback((slotIdx: number) => {
    if (result !== "pending") return;
    setFilledSlots((prev) => {
      const word = prev[slotIdx];
      if (word) setUsedWords((uw) => uw.filter((w, i) => !(w === word && i === uw.lastIndexOf(word))));
      const updated = [...prev];
      updated[slotIdx] = null;
      return updated;
    });
  }, [result]);

  const checkAnswer = useCallback(() => {
    if (!currentChallenge || filledSlots.some((s) => s === null)) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = currentChallenge.slots.every(
      (slot, i) => filledSlots[i]?.toLowerCase().replace(/[,.]$/, "") === slot.answer.toLowerCase().replace(/[,.]$/, "")
    );

    if (isCorrect) {
      const newStreak = streak + 1;
      const breakdown = computeWorkshopPoints({ arcade: mode === "arcade", timeLeft, newStreak });
      fxSeqRef.current += 1;
      setLastBreakdown({
        ...breakdown,
        perfect: mode === "arcade" && breakdown.timeBonus >= 25,
        seq: fxSeqRef.current,
      });
      setScore((s) => s + breakdown.total);
      setStreak(newStreak);
      setMaxStreak((ms) => Math.max(ms, newStreak));
      setCorrectCount((c) => c + 1);

      playSfx("correct");
      if (STREAK_MILESTONES.includes(newStreak)) {
        playSfx("streak");
        setMilestone({ streak: newStreak, seq: fxSeqRef.current });
        burstConfetti({ count: 24, spread: 55 });
      }
      // First time this game's running total passes the previous best score.
      if (bestBefore > 0 && score + breakdown.total > bestBefore && !newBestFiredRef.current) {
        newBestFiredRef.current = true;
        setNewBestSeq(fxSeqRef.current);
        playSfx("newBest");
        burstConfetti({ count: 40, spread: 70 });
      }
    } else {
      setStreak(0);
      setLastBreakdown(null);
      // Wrong-answer SFX fires from the result effect below (it also covers
      // the timeout path).
    }

    setResult(isCorrect ? "correct" : "incorrect");
    setTimeout(() => {
      const nextIndex = roundIndex + 1;
      if (nextIndex >= challenges.length) {
        setGameStatus("completed");
      } else {
        setRoundIndex(nextIndex);
        loadChallenge(nextIndex, challenges);
      }
    }, 3000);
  }, [currentChallenge, filledSlots, streak, score, bestBefore, roundIndex, challenges, loadChallenge, mode, timeLeft]);

  // Wrong-answer SFX lives in an effect (not the timeout callback) because the
  // timeout path sets result from inside a state updater, which StrictMode
  // double-invokes — an effect fires exactly once per round.
  useEffect(() => {
    if (gameStatus === "playing" && result === "incorrect") {
      playSfx("wrong");
    }
  }, [gameStatus, result]);

  // Countdown tick for the final 3 seconds (arcade / mastery only).
  useEffect(() => {
    if (
      gameStatus === "playing" &&
      mode !== "practice" &&
      result === "pending" &&
      timeLeft > 0 &&
      timeLeft <= 3
    ) {
      playSfx("tick");
    }
  }, [timeLeft, gameStatus, mode, result]);

  useEffect(() => {
    if (gameStatus === "completed" && challenges.length > 0) {
      const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
      setGrammarWorkshopHighScore(score, accuracy);
      setGrammarGameAccuracy(accuracy);
      logActivity("grammar_workshop_complete", { sessionId: id || undefined, score, accuracy });
      // Achievement-granular event (On Fire): 5+ streak in one game. Separate
      // activity type — doesn't disturb the workshop completion counter.
      if (maxStreak >= 5) {
        logActivity("grammar_hot_streak", {
          sessionId: id || undefined,
          score,
          accuracy,
          details: { mode, game: "workshop", streak: maxStreak },
        });
      }
      const session = backup();
      const updated = update(id, session);
      if (!updated) save(session);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const handleGenerateNew = async () => {
    const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
    try {
      await generateGrammarWorkshopContent();
    } finally {
      toast.dismiss(tid);
    }
  };

  // ── Render template with slots ────────────────────────────────────────────
  const renderTemplate = () => {
    if (!currentChallenge) return null;
    const parts = currentChallenge.template.split(/(__\[.*?\]__)/g);
    let slotCounter = 0;

    return (
      <p className="text-sm leading-relaxed text-foreground">
        {parts.map((part, i) => {
          if (part.match(/^__\[.*?\]__$/)) {
            const idx = slotCounter++;
            const filled = filledSlots[idx];
            return (
              <button
                key={i}
                onClick={() => filled ? removeSlot(idx) : undefined}
                className={cn(
                  "inline-block mx-1 px-3 py-0.5 rounded-md border-2 text-sm font-semibold transition-all",
                  filled
                    ? result === "correct"
                      ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : result === "incorrect"
                      ? "border-red-400 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                      : "border-primary bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground min-w-[60px] text-center"
                )}
              >
                {filled ?? part.replace(/__\[|\]__/g, "")}
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  // ── Setup ────────────────────────────────────────────────────────────────
  if (gameStatus === "setup") {
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="space-y-1">
          <h3 className="font-bold text-base">{t("reading.grammar.games.workshop.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("reading.grammar.games.workshop.description")}</p>
        </div>
        {isAutoGenerating ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center">{t("reading.grammar.games.generating")}</p>
          </div>
        ) : (
          <>
            <GameModeSelector mode={mode} onChange={setMode} />
            <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
              <span>{t("reading.grammar.games.rounds", { count: challenges.length })}</span>
              {grammarWorkshopHighScore > 0 && (
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    🏆 {grammarWorkshopHighScore}
                  </span>
                  {grammarWorkshopAccuracy > 0 && (
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      🎯 {grammarWorkshopAccuracy}%
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={startGame} className="flex-1" disabled={challenges.length === 0 || isGenerating}>
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

  // ── Completed ─────────────────────────────────────────────────────────────
  if (gameStatus === "completed") {
    const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
    // Frozen against the start-of-game snapshot — the completion effect has
    // already raised the store best by the time this renders.
    const isNewHigh = score > bestBefore;
    return (
      <GameResultScreen
        onBack={onBack}
        score={score}
        accuracy={accuracy}
        isNewHigh={isNewHigh}
        stats={[
          { label: t("reading.grammar.games.accuracy"), value: `${accuracy}%`, highlight: true },
          { label: t("reading.grammar.games.streak"), value: maxStreak },
          { label: t("reading.grammar.games.rounds", { count: challenges.length }), value: `${correctCount}/${challenges.length}` },
        ]}
        onPlayAgain={startGame}
        onGenerateNew={handleGenerateNew}
        isGenerating={isGenerating}
        showGenerateLabel
      />
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (!currentChallenge) return null;
  const allFilled = filledSlots.every((s) => s !== null);

  return (
    <div className="relative space-y-4">
      {milestone && (
        <MilestoneBanner
          key={`mb-${milestone.seq}`}
          message={t("reading.grammar.games.fx.milestone", { count: milestone.streak })}
        />
      )}
      {newBestSeq > 0 && (
        <MilestoneBanner
          key={`nb-${newBestSeq}`}
          message={t("reading.grammar.games.fx.newBest")}
          className="top-12"
        />
      )}
      <div className="flex items-center justify-between">
        <GameBackButton onBack={onBack} />
        <div className="flex items-center gap-3">
          {mode !== "practice" && (
            <span className={cn(
              "text-lg font-bold tabular-nums",
              timeLeft <= 3
                ? "text-red-500 animate-urgent-pulse"
                : timeLeft <= 10
                ? "text-red-500 animate-pulse"
                : "text-muted-foreground"
            )}>
              {timeLeft}s
            </span>
          )}
          <StreakFlame streak={streak} fxPrefix={GRAMMAR_FX} />
          <span className="text-xs font-semibold text-muted-foreground"><AnimatedScore value={score} /> pts</span>
        </div>
      </div>

      <Progress value={(roundIndex / challenges.length) * 100} className="h-1.5" />
      <div className="text-xs text-muted-foreground text-right">{roundIndex + 1} / {challenges.length}</div>

      {/* Topic */}
      <Badge variant="outline" className="text-xs">{topicName}</Badge>

      {/* Sentence with slots */}
      <div className="relative rounded-xl bg-muted/30 border p-4 leading-loose min-h-[64px]">
        {result !== "pending" && lastBreakdown && (
          <PointPopup key={`pp-${lastBreakdown.seq}`} breakdown={lastBreakdown} fxPrefix={GRAMMAR_FX} />
        )}
        {renderTemplate()}
      </div>

      {/* Pattern hint */}
      {mode !== "mastery" && (
        <p className="text-xs text-muted-foreground font-mono">
          {t("reading.grammar.games.workshop.pattern")}: {currentChallenge.slots.map(s => `[${s.label}]`).join(" + ")}
        </p>
      )}

      {/* Word bank */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t("reading.grammar.games.workshop.wordBank")}</p>
        <div className="flex flex-wrap gap-2">
          {currentChallenge.wordBank.map((word, i) => {
            const isUsed = usedWords.includes(word) && usedWords.filter(w => w === word).length > (currentChallenge.wordBank.filter(w => w === word).length - 1);
            return (
              <button
                key={`${word}-${i}`}
                onClick={() => !isUsed && selectWord(word)}
                disabled={result !== "pending" || isUsed}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  isUsed
                    ? "border-border bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer"
                )}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {result !== "pending" && (
        <AnswerFeedback
          isCorrect={result === "correct"}
          explanation={
            result === "correct"
              ? currentChallenge.explanation
              : `${t("reading.grammar.games.workshop.correct")}: ${currentChallenge.slots.map(s => s.answer).join(", ")} — ${currentChallenge.explanation}`
          }
        />
      )}

      {/* Check button */}
      {result === "pending" && allFilled && (
        <Button onClick={checkAnswer} className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {t("reading.grammar.games.workshop.check")}
        </Button>
      )}
    </div>
  );
}
