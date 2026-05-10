"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Stethoscope, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, GameModeSelector, AnswerFeedback } from "./GrammarGames";
import { logActivity } from "@/utils/activityLogger";
import GameResultScreen from "./GameResultScreen";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Locate the token-index span of errorWord within the sentence token array.
 *  Returns null if not found. Handles both single-word and multi-word errorWords.
 */
function computeErrorSpan(
  tokens: string[],
  errorWord: string
): { start: number; end: number } | null {
  const strip = (w: string) => w.toLowerCase().replace(/[,.:;?!'"()]+$/g, "");
  const errorTokens = errorWord.split(/\s+/).map(strip);
  for (let i = 0; i <= tokens.length - errorTokens.length; i++) {
    if (errorTokens.every((et, j) => strip(tokens[i + j]) === et)) {
      return { start: i, end: i + errorTokens.length - 1 };
    }
  }
  return null;
}

interface Props { onBack: () => void }

export default function GrammarErrorSurgery({ onBack }: Props) {
  const { t } = useTranslation();
  const {
    grammarTopics,
    grammarErrorChallenges,
    grammarSurgeryHighScore,
    grammarSurgeryAccuracy,
    setGrammarSurgeryHighScore,
    setGrammarGameAccuracy,
    id,
    backup,
  } = useReadingStore();
  const { generateErrorSurgeryContent } = useReadingAssistant();
  const { update, save } = useHistoryStore();

  const [gameStatus, setGameStatus] = useState<GrammarGameStatus>("setup");
  const [mode, setMode] = useState<GrammarGameMode>("practice");
  const [challenges, setChallenges] = useState<ErrorSurgeryChallenge[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<{ start: number; end: number } | null>(null);
  const [result, setResult] = useState<"pending" | "correct" | "incorrect">("pending");
  const [showOptions, setShowOptions] = useState(false);
  const [correctionOptions, setCorrectionOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sync store cache → local challenges ──────────────────────────────────
  useEffect(() => {
    if (grammarErrorChallenges.length > 0) {
      setChallenges(grammarErrorChallenges);
    }
  }, [grammarErrorChallenges]);

  // ── Auto-generate on first entry if cache is empty ───────────────────────
  useEffect(() => {
    if (grammarErrorChallenges.length === 0 && grammarTopics.length > 0) {
      setIsAutoGenerating(true);
      const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
      generateErrorSurgeryContent().finally(() => { setIsAutoGenerating(false); toast.dismiss(tid); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentChallenge = challenges[roundIndex] ?? null;
  const topicName = grammarTopics.find((t) => t.id === currentChallenge?.topicId)?.name ?? "";

  // ── Build correction options for the selected error word ─────────────────
  const buildCorrectionOptions = useCallback((challenge: ErrorSurgeryChallenge): string[] => {
    const distractors = (challenge.distractors ?? [])
      .filter(w => w && w.trim().length > 0)
      .slice(0, 3);
    return shuffleArray([challenge.correction, ...distractors]);
  }, []);

  const handleWordClick = useCallback((word: string, index: number, tokens: string[]) => {
    if (result !== "pending" || !currentChallenge) return;
    const errorSpan = computeErrorSpan(tokens, currentChallenge.errorWord);
    if (errorSpan && index >= errorSpan.start && index <= errorSpan.end) {
      // Tapped within the error phrase — auto-expand selection to cover the full phrase
      setSelectedWord(currentChallenge.errorWord);
      setSelectedSpan(errorSpan);
    } else {
      setSelectedWord(word);
      setSelectedSpan({ start: index, end: index });
    }
    setCorrectionOptions(buildCorrectionOptions(currentChallenge));
    setShowOptions(true);
  }, [result, currentChallenge, buildCorrectionOptions]);

  const handleCorrectionSelect = useCallback((correction: string) => {
    if (!currentChallenge) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect =
      selectedWord?.toLowerCase().replace(/[,.]$/, "") === currentChallenge.errorWord.toLowerCase().replace(/[,.]$/, "") &&
      correction.toLowerCase() === currentChallenge.correction.toLowerCase();

    let pts = 0;
    if (isCorrect) {
      pts = 100;
      if (mode === "arcade") pts += Math.round((timeLeft / 20) * 50);
      const newStreak = streak + 1;
      if (newStreak >= 3) pts += Math.floor(pts * 0.1 * Math.min(newStreak - 2, 5));
      setScore((s) => s + pts);
      setStreak(newStreak);
      setMaxStreak((ms) => Math.max(ms, newStreak));
      setCorrectCount((c) => c + 1);
    } else {
      setStreak(0);
    }

    setResult(isCorrect ? "correct" : "incorrect");
    setShowOptions(false);
    setTimeout(() => {
      const nextIndex = roundIndex + 1;
      if (nextIndex >= challenges.length) {
        setGameStatus("completed");
      } else {
        setRoundIndex(nextIndex);
        setSelectedWord(null);
        setSelectedSpan(null);
        setResult("pending");
        setTimeLeft(20);
      }
    }, 3000);
  }, [currentChallenge, selectedWord, streak, roundIndex, challenges.length, mode, timeLeft]);

  const startGame = useCallback(() => {
    if (challenges.length === 0) return;
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setSelectedWord(null);
    setSelectedSpan(null);
    setResult("pending");
    setShowOptions(false);
    setTimeLeft(20);
    setGameStatus("playing");
  }, [challenges]);

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
          // Time's up — count as incorrect, advance
          setStreak(0);
          setResult("incorrect");
          setShowOptions(false);
          setTimeout(() => {
            setRoundIndex((ri) => {
              const nextIndex = ri + 1;
              if (nextIndex >= challenges.length) {
                setGameStatus("completed");
                return ri;
              }
              setSelectedWord(null);
              setSelectedSpan(null);
              setResult("pending");
              setTimeLeft(20);
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

  useEffect(() => {
    if (gameStatus === "completed" && challenges.length > 0) {
      const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
      setGrammarSurgeryHighScore(score, accuracy);
      setGrammarGameAccuracy(accuracy);
      logActivity("grammar_surgery_complete", { sessionId: id || undefined, score, accuracy });
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
      await generateErrorSurgeryContent();
    } finally {
      setIsGenerating(false);
      toast.dismiss(tid);
    }
  };

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (gameStatus === "setup") {
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="space-y-1">
          <h3 className="font-bold text-base">{t("reading.grammar.games.surgery.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("reading.grammar.games.surgery.description")}</p>
        </div>

        {isAutoGenerating ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center">{t("reading.grammar.games.surgery.generating")}</p>
          </div>
        ) : (
          <>
            <GameModeSelector mode={mode} onChange={setMode} />
            <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
              <span>{t("reading.grammar.games.rounds", { count: challenges.length })}</span>
              {grammarSurgeryHighScore > 0 && (
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    🏆 {grammarSurgeryHighScore}
                  </span>
                  {grammarSurgeryAccuracy > 0 && (
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      🎯 {grammarSurgeryAccuracy}%
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
    const isNewHigh = score > grammarSurgeryHighScore;
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
  const words = currentChallenge.sentence.split(/\s+/).filter(Boolean);
  const errorSpan = computeErrorSpan(words, currentChallenge.errorWord);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <GameBackButton onBack={onBack} />
        <div className="flex items-center gap-3">
          {mode !== "practice" && (
            <span className={cn(
              "text-lg font-bold tabular-nums",
              timeLeft <= 7 ? "text-red-500 animate-pulse" : "text-muted-foreground"
            )}>
              {timeLeft}s
            </span>
          )}
          {streak >= 2 && <span className="text-xs text-orange-500 font-bold">🔥 ×{streak}</span>}
          <span className="text-xs font-semibold text-muted-foreground">{score} pts</span>
        </div>
      </div>

      <Progress value={(roundIndex / challenges.length) * 100} className="h-1.5" />
      <div className="text-xs text-muted-foreground text-right">{roundIndex + 1} / {challenges.length}</div>

      <Badge variant="outline" className="text-xs">{topicName}</Badge>

      {/* Instruction */}
      <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-4 py-2.5">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <Stethoscope className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">{t("reading.grammar.games.surgery.tap")}</p>
        </div>
      </div>

      {/* Sentence with clickable words */}
      <div className="rounded-xl border p-4 leading-loose">
        <p className="flex flex-wrap gap-x-1 gap-y-1.5 text-sm">
          {words.map((word, i) => {
            const isError = errorSpan !== null && i >= errorSpan.start && i <= errorSpan.end;
            const isSelected = selectedSpan !== null && i >= selectedSpan.start && i <= selectedSpan.end;
            return (
              <button
                key={`${word}-${i}`}
                onClick={() => handleWordClick(word, i, words)}
                disabled={result !== "pending"}
                className={cn(
                  "rounded px-1 py-0.5 transition-all text-sm",
                  result !== "pending" && isError
                    ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-400 font-semibold"
                    : isSelected
                    ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 text-amber-800 dark:text-amber-200 font-semibold"
                    : result === "pending"
                    ? "hover:bg-muted cursor-pointer border border-transparent hover:border-border"
                    : "cursor-default"
                )}
              >
                {word}
              </button>
            );
          })}
        </p>
      </div>

      {/* Correction options panel */}
      {showOptions && selectedWord && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-2 animate-in slide-in-from-bottom-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {t("reading.grammar.games.surgery.correction")}: <span className="font-mono">{selectedWord}</span> →
          </p>
          <div className="grid grid-cols-2 gap-2">
            {correctionOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => handleCorrectionSelect(opt)}
                className="px-3 py-2 rounded-lg border text-sm font-medium bg-card hover:bg-primary/5 hover:border-primary transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {result !== "pending" && (
        <AnswerFeedback
          isCorrect={result === "correct"}
          explanation={`${currentChallenge.errorWord} → ${currentChallenge.correction}. ${currentChallenge.explanation}`}
        />
      )}
    </div>
  );
}
