"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Lightbulb, CheckCircle2, LoaderCircle } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, GameModeSelector, AnswerFeedback, GameStatRow } from "./GrammarGames";
import { logActivity } from "@/utils/activityLogger";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordChip {
  id: string;   // unique per chip (word + index)
  word: string;
  placed: boolean;
}

interface RoundState {
  challenge: GrammarScrambleChallenge;
  topicName: string;
  chips: WordChip[];       // shuffled source chips
  answer: WordChip[];      // placed in order by the player
  result: "pending" | "correct" | "incorrect";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export default function GrammarWordScramble({ onBack }: Props) {
  const { t } = useTranslation();
  const {
    grammarTopics,
    grammarScrambleChallenges,
    grammarScrambleHighScore,
    setGrammarScrambleHighScore,
    id, backup,
  } = useReadingStore();
  const { generateGrammarScrambleContent } = useReadingAssistant();
  const { update, save } = useHistoryStore();

  const [gameStatus, setGameStatus] = useState<GrammarGameStatus>("setup");
  const [mode, setMode] = useState<GrammarGameMode>("practice");
  const [challenges, setChallenges] = useState<GrammarScrambleChallenge[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<RoundState | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sync store cache → local challenges ──────────────────────────────────
  useEffect(() => {
    if (grammarScrambleChallenges.length > 0) {
      setChallenges(grammarScrambleChallenges);
    }
  }, [grammarScrambleChallenges]);

  // ── Auto-generate on first entry if cache is empty ───────────────────────
  useEffect(() => {
    if (grammarScrambleChallenges.length === 0 && grammarTopics.length > 0) {
      setIsAutoGenerating(true);
      generateGrammarScrambleContent().finally(() => setIsAutoGenerating(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer (Arcade / Mastery mode) ────────────────────────────────────────
  useEffect(() => {
    if (gameStatus !== "playing" || mode === "practice") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, mode, roundIndex]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const buildRound = useCallback((challenge: GrammarScrambleChallenge, topics: GrammarTopic[]): RoundState => {
    const topicName = topics.find((t) => t.id === challenge.topicId)?.name ?? "";
    const words = challenge.sentence.split(/\s+/).filter(Boolean);
    const chips: WordChip[] = shuffleArray(words.map((word, i) => ({ id: `${word}-${i}`, word, placed: false })));
    return { challenge, topicName, chips, answer: [], result: "pending" };
  }, []);

  const startGame = useCallback(() => {
    if (challenges.length === 0) return;
    const first = challenges[0];
    setRound(buildRound(first, grammarTopics));
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setHintsUsed(0);
    setShowHint(false);
    setTimeLeft(30);
    setGameStatus("playing");
  }, [challenges, grammarTopics, buildRound]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRound((prev) => prev ? { ...prev, result: "incorrect" } : prev);
    setStreak(0);
    setTimeout(() => advanceRound(), 3000);
  }, [advanceRound]);

  const advanceRound = useCallback(() => {
    setRound((prevRound) => {
      const nextIndex = roundIndex + 1;
      if (nextIndex >= challenges.length) {
        setGameStatus("completed");
        return prevRound;
      }
      setRoundIndex(nextIndex);
      setShowHint(false);
      setTimeLeft(30);
      return buildRound(challenges[nextIndex], grammarTopics);
    });
  }, [roundIndex, challenges, grammarTopics, buildRound]);

  const placeChip = useCallback((chip: WordChip) => {
    if (!round || round.result !== "pending" || chip.placed) return;
    setRound((prev) => {
      if (!prev) return prev;
      const newChips = prev.chips.map((c) => c.id === chip.id ? { ...c, placed: true } : c);
      const newAnswer = [...prev.answer, { ...chip, placed: true }];
      return { ...prev, chips: newChips, answer: newAnswer };
    });
  }, [round]);

  const removeChip = useCallback((chip: WordChip, indexInAnswer: number) => {
    if (!round || round.result !== "pending") return;
    setRound((prev) => {
      if (!prev) return prev;
      const newAnswer = prev.answer.filter((_, i) => i !== indexInAnswer);
      const newChips = prev.chips.map((c) => c.id === chip.id ? { ...c, placed: false } : c);
      return { ...prev, chips: newChips, answer: newAnswer };
    });
  }, [round]);

  const checkAnswer = useCallback(() => {
    if (!round) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const playerSentence = round.answer.map((c) => c.word).join(" ");
    const correct = playerSentence.trim() === round.challenge.sentence.trim();

    let pts = 0;
    if (correct) {
      pts = 100;
      if (mode === "arcade") pts += Math.round((timeLeft / 30) * 50);
      const newStreak = streak + 1;
      if (newStreak >= 3) pts += Math.floor(pts * 0.1 * Math.min(newStreak - 2, 5));
      pts -= hintsUsed * 15;
      pts = Math.max(pts, 10);
      setScore((s) => s + pts);
      setStreak(newStreak);
      setMaxStreak((ms) => Math.max(ms, newStreak));
      setCorrectCount((c) => c + 1);
    } else {
      setStreak(0);
    }

    setRound((prev) => prev ? { ...prev, result: correct ? "correct" : "incorrect" } : prev);
    setTimeout(() => advanceRound(), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode, timeLeft, streak, hintsUsed]);

  // ── Save on completion ────────────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus === "completed" && challenges.length > 0) {
      setGrammarScrambleHighScore(score);
      logActivity("grammar_scramble_complete", { sessionId: id || undefined, score });
      const session = backup();
      const updated = update(id, session);
      if (!updated) save(session);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  // ── AI refresh ────────────────────────────────────────────────────────────
  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      await generateGrammarScrambleContent();
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Render: Setup ─────────────────────────────────────────────────────────
  if (gameStatus === "setup") {
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="space-y-1">
          <h3 className="font-bold text-base">{t("reading.grammar.games.scramble.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("reading.grammar.games.scramble.description")}</p>
        </div>

        {isAutoGenerating && (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center">{t("reading.grammar.games.generating")}</p>
          </div>
        )}

        {!isAutoGenerating && <GameModeSelector mode={mode} onChange={setMode} />}

        {!isAutoGenerating && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
              <span>{t("reading.grammar.games.rounds", { count: challenges.length })}</span>
              {grammarScrambleHighScore > 0 && (
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  🏆 {grammarScrambleHighScore}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={startGame} className="flex-1" disabled={challenges.length === 0}>
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

  // ── Render: Completed ─────────────────────────────────────────────────────
  if (gameStatus === "completed") {
    const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
    const isNewHigh = score > grammarScrambleHighScore;

    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="text-center space-y-2 py-4">
          <div className="text-5xl font-black text-primary">{score}</div>
          <div className="text-sm text-muted-foreground">{t("reading.grammar.games.score")}</div>
          {isNewHigh && (
            <Badge className="bg-amber-500 text-white">🏆 {t("reading.grammar.games.newBest")}</Badge>
          )}
        </div>

        <div className="border rounded-lg divide-y">
          <GameStatRow label={t("reading.grammar.games.accuracy")} value={`${accuracy}%`} highlight />
          <GameStatRow label={t("reading.grammar.games.streak")} value={maxStreak} />
          <GameStatRow label={t("reading.grammar.games.rounds", { count: challenges.length })} value={`${correctCount}/${challenges.length}`} />
        </div>

        <div className="flex gap-2">
          <Button onClick={startGame} className="flex-1">{t("reading.grammar.games.playAgain")}</Button>
          <Button variant="outline" onClick={handleGenerateNew} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{t("reading.grammar.games.generateChallenges")}</span>
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Playing ───────────────────────────────────────────────────────
  if (!round) return null;
  const originalWords = round.challenge.sentence.split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <GameBackButton onBack={onBack} />
        {mode !== "practice" && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "text-lg font-bold tabular-nums",
                timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-muted-foreground"
              )}
            >
              {timeLeft}s
            </div>
          </div>
        )}
      </div>

      <Progress value={((roundIndex) / challenges.length) * 100} className="h-1.5" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{roundIndex + 1} / {challenges.length}</span>
        <div className="flex items-center gap-3">
          {streak >= 2 && <span className="text-orange-500 font-bold">🔥 ×{streak}</span>}
          <span className="font-semibold">{score} pts</span>
        </div>
      </div>

      {/* Topic & hint */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{round.topicName}</Badge>
          {mode !== "mastery" && (
            <button
              onClick={() => { setShowHint(true); setHintsUsed((h) => h + 1); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              disabled={showHint}
            >
              <Lightbulb className="h-3 w-3" />
              {t("reading.grammar.games.hint")}
            </button>
          )}
        </div>
        {showHint && (
          <p className="text-xs font-mono text-primary">{round.challenge.hint}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("reading.grammar.games.scramble.tapToSelect")}</p>
      </div>

      {/* Answer zone */}
      <div className="min-h-[56px] rounded-xl border-2 border-dashed border-border bg-muted/30 p-3 flex flex-wrap gap-2 items-center">
        {round.answer.length === 0 ? (
          <span className="text-xs text-muted-foreground italic w-full text-center">
            {t("reading.grammar.games.scramble.tapToSelect")}
          </span>
        ) : (
          round.answer.map((chip, i) => (
            <button
              key={`answer-${chip.id}-${i}`}
              onClick={() => removeChip(chip, i)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
                round.result === "correct"
                  ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : round.result === "incorrect"
                  ? "border-red-400 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                  : "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {chip.word}
            </button>
          ))
        )}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {round.chips
          .filter((c) => !c.placed)
          .map((chip) => (
            <button
              key={chip.id}
              onClick={() => placeChip(chip)}
              disabled={round.result !== "pending"}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                "border-border bg-card hover:border-primary hover:bg-primary/5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {chip.word}
            </button>
          ))}
      </div>

      {/* Feedback */}
      {round.result !== "pending" && (
        <AnswerFeedback
          isCorrect={round.result === "correct"}
          explanation={
            round.result === "correct"
              ? t("reading.grammar.games.correct")
              : `${t("reading.grammar.games.incorrect")} ${originalWords.join(" ")}`
          }
        />
      )}

      {/* Check button */}
      {round.result === "pending" && round.answer.length === originalWords.length && (
        <Button onClick={checkAnswer} className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {t("reading.grammar.games.checkAnswer")}
        </Button>
      )}

      {round.result === "incorrect" && (
        <div className="text-xs text-muted-foreground text-center">
          <span className="font-medium text-foreground">{t("reading.grammar.games.correctOrder")}:</span>{" "}
          {originalWords.join(" ")}
        </div>
      )}
    </div>
  );
}
