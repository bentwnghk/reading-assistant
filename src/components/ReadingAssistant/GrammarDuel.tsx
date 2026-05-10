"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, LoaderCircle, Swords, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, AnswerFeedback } from "./GrammarGames";
import { logActivity } from "@/utils/activityLogger";
import GameResultScreen from "./GameResultScreen";

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { aiThinkTime: [number, number]; aiCorrectRate: number; label: string }> = {
  easy:   { aiThinkTime: [16000, 28000], aiCorrectRate: 0.4, label: "Easy" },
  medium: { aiThinkTime: [8000, 16000],  aiCorrectRate: 0.6, label: "Medium" },
  hard:   { aiThinkTime: [3000, 8000],  aiCorrectRate: 0.8, label: "Hard" },
};

const MAX_HP = 100;
const BASE_DAMAGE = 20;
const POWER_MOVE_THRESHOLD = 3;

interface Props { onBack: () => void }

// ── Component ─────────────────────────────────────────────────────────────────

export default function GrammarDuel({ onBack }: Props) {
  const { t } = useTranslation();
  const {
    grammarTopics,
    grammarGameQuestions,
    grammarDuelHighScore,
    grammarDuelAccuracy,
    setGrammarDuelHighScore,
    setGrammarGameAccuracy,
    id, backup,
  } = useReadingStore();
  const { generateGrammarQuestions } = useReadingAssistant();
  const { update, save } = useHistoryStore();

  const [gameStatus, setGameStatus] = useState<GrammarGameStatus>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questions, setQuestions] = useState<GrammarGameQuestion[]>([]);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  const [playerHp, setPlayerHp] = useState(MAX_HP);
  const [aiHp, setAiHp] = useState(MAX_HP);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hitAnimation, setHitAnimation] = useState<"player" | "ai" | null>(null);
  const [isPowerMove, setIsPowerMove] = useState(false);
  const [roundResult, setRoundResult] = useState<"player-wins" | "ai-wins" | "draw" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usedQIndices = useRef<Set<number>>(new Set());

  // ── Sync store cache → local questions ───────────────────────────────────
  useEffect(() => {
    if (grammarGameQuestions.length > 0) {
      setQuestions(grammarGameQuestions);
    }
  }, [grammarGameQuestions]);

  // ── Auto-generate on first entry if cache is empty ───────────────────────
  useEffect(() => {
    if (grammarGameQuestions.length === 0 && grammarTopics.length > 0) {
      setIsAutoGenerating(true);
      const tid = toast.info(t("reading.grammar.games.generatingWait"), { duration: Infinity, position: "bottom-right" });
      generateGrammarQuestions().finally(() => { setIsAutoGenerating(false); toast.dismiss(tid); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[queueIndex] ?? null;
  const currentTopic = grammarTopics.find((t) => t.id === currentQuestion?.topicId);

  const getNextQueueIndex = useCallback((current: number, total: number): number => {
    if (usedQIndices.current.size >= total) {
      usedQIndices.current.clear();
    }
    let next = (current + 1) % total;
    let tries = 0;
    while (usedQIndices.current.has(next) && tries < total) {
      next = (next + 1) % total;
      tries++;
    }
    return next;
  }, []);

  const applyDamage = useCallback((target: "player" | "ai", dmg: number) => {
    setHitAnimation(target);
    setTimeout(() => setHitAnimation(null), 600);
    if (target === "player") setPlayerHp((hp) => Math.max(0, hp - dmg));
    else setAiHp((hp) => Math.max(0, hp - dmg));
  }, []);

  const handleAnswer = useCallback((optIdx: number) => {
    if (isAnswered || !currentQuestion) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    setSelectedOption(optIdx);
    setIsAnswered(true);
    setIsAiThinking(false);

    const isCorrect = optIdx === currentQuestion.correctIndex;
    setTotalAnswered((n) => n + 1);

    if (isCorrect) {
      const newStreak = playerStreak + 1;
      setPlayerStreak(newStreak);
      setCorrectCount((c) => c + 1);

      const isPower = newStreak >= POWER_MOVE_THRESHOLD && newStreak % POWER_MOVE_THRESHOLD === 0;
      const dmg = isPower ? BASE_DAMAGE * 2 : BASE_DAMAGE;
      if (isPower) setIsPowerMove(true);

      applyDamage("ai", dmg);
      setScore((s) => s + (isPower ? 200 : 100));
      setRoundResult("player-wins");

      setTimeout(() => {
        const newAiHp = Math.max(0, (aiHp - dmg));
        if (newAiHp <= 0) { setGameStatus("completed"); return; }
        advanceRound();
      }, isPower ? 3500 : 3000);
    } else {
      setPlayerStreak(0);
      applyDamage("player", BASE_DAMAGE);
      setRoundResult("ai-wins");
      setTimeout(() => {
        const newPlayerHp = Math.max(0, (playerHp - BASE_DAMAGE));
        if (newPlayerHp <= 0) { setGameStatus("completed"); return; }
        advanceRound();
      }, 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswered, currentQuestion, playerStreak, aiHp, playerHp, applyDamage]);

  const advanceRound = useCallback(() => {
    setSelectedOption(null);
    setIsAnswered(false);
    setRoundResult(null);
    const next = getNextQueueIndex(queueIndex, questions.length);
    usedQIndices.current.add(next);
    setQueueIndex(next);
  }, [queueIndex, questions.length, getNextQueueIndex]);

  // AI think timer — starts each new question
  useEffect(() => {
    if (gameStatus !== "playing" || isAnswered || questions.length === 0) return;
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const thinkTime = cfg.aiThinkTime[0] + Math.random() * (cfg.aiThinkTime[1] - cfg.aiThinkTime[0]);
    setIsAiThinking(true);
    aiTimerRef.current = setTimeout(() => {
      if (isAnswered) return; // player already answered
      const aiCorrect = Math.random() < cfg.aiCorrectRate;
      setIsAiThinking(false);
      setIsAnswered(true);
      setTotalAnswered((n) => n + 1);

      if (aiCorrect) {
        applyDamage("player", BASE_DAMAGE);
        setPlayerStreak(0);
        setRoundResult("ai-wins");
      } else {
        applyDamage("ai", BASE_DAMAGE);
        setRoundResult("draw"); // AI answered wrong, no one gets score
      }

      setTimeout(() => {
        if (playerHp - (aiCorrect ? BASE_DAMAGE : 0) <= 0) { setGameStatus("completed"); return; }
        if (aiHp - (!aiCorrect ? BASE_DAMAGE : 0) <= 0) { setGameStatus("completed"); return; }
        advanceRound();
      }, 3000);
    }, thinkTime);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIndex, gameStatus, isAnswered, questions.length]);

  const startGame = useCallback(() => {
    if (questions.length === 0) return;
    setQueueIndex(0);
    usedQIndices.current = new Set([0]);
    setPlayerHp(MAX_HP);
    setAiHp(MAX_HP);
    setPlayerStreak(0);
    setScore(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setRoundResult(null);
    setIsPowerMove(false);
    setHitAnimation(null);
    setGameStatus("playing");
  }, [questions]);

  useEffect(() => {
    if (gameStatus === "completed") {
      const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
      setGrammarDuelHighScore(score, accuracy);
      setGrammarGameAccuracy(accuracy);
      logActivity("grammar_duel_complete", { sessionId: id || undefined, score, accuracy });
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

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (gameStatus === "setup") {
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="space-y-1">
          <h3 className="font-bold text-base">{t("reading.grammar.games.duel.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("reading.grammar.games.duel.description")}</p>
        </div>
        {isAutoGenerating ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center">{t("reading.grammar.games.generating")}</p>
          </div>
        ) : (
          <>
            {/* Difficulty selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("reading.grammar.games.duel.opponentLevel")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-all",
                      difficulty === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {t(`reading.grammar.games.duel.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
              <span>{questions.length} {t("reading.grammar.games.questionsAvailable")}</span>
              {grammarDuelHighScore > 0 && (
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    🏆 {grammarDuelHighScore}
                  </span>
                  {grammarDuelAccuracy > 0 && (
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      🎯 {grammarDuelAccuracy}%
                    </span>
                  )}
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

  // ── Completed ─────────────────────────────────────────────────────────────
  if (gameStatus === "completed") {
    const playerWon = aiHp <= 0 || (playerHp > aiHp);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const isNewHigh = score > grammarDuelHighScore;
    return (
      <GameResultScreen
        onBack={onBack}
        score={score}
        scoreLabel={`${score} pts`}
        scorePrefix={
          <>
            <div className="text-4xl">{playerWon ? "🏆" : "💀"}</div>
            <h3 className={cn("text-2xl font-black", playerWon ? "text-green-600 dark:text-green-400" : "text-red-500")}>
              {playerWon ? t("reading.grammar.games.duel.victory") : t("reading.grammar.games.duel.defeat")}
            </h3>
          </>
        }
        accuracy={accuracy}
        isNewHigh={isNewHigh}
        stats={[
          { label: t("reading.grammar.games.accuracy"), value: `${accuracy}%`, highlight: true },
          { label: t("reading.grammar.games.duel.playerHp"), value: `${playerHp}/${MAX_HP}` },
          { label: t("reading.grammar.games.duel.opponentHp"), value: `${aiHp}/${MAX_HP}` },
        ]}
        onPlayAgain={startGame}
        onGenerateNew={handleGenerateNew}
        isGenerating={isGenerating}
        showGenerateLabel
      />
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (!currentQuestion) return null;

  return (
    <div className="space-y-4">
      <GameBackButton onBack={onBack} />

      {/* Power Move overlay */}
      {isPowerMove && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-yellow-400/10 animate-in fade-in duration-100">
          <div className="text-center animate-bounce">
            <Zap className="h-16 w-16 text-yellow-500 mx-auto" />
            <p className="text-2xl font-black text-yellow-600 drop-shadow-lg">
              {t("reading.grammar.games.duel.powerMove")}
            </p>
          </div>
        </div>
      )}

      {/* HP Bars */}
      <div className="grid grid-cols-2 gap-3">
        {/* Player */}
        <div className={cn("rounded-xl border-2 p-3 space-y-1.5 transition-all",
          hitAnimation === "player" ? "border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse" : "border-blue-400 dark:border-blue-600")}>
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{t("reading.grammar.games.duel.you")}</span>
            {playerStreak >= 2 && <span className="text-xs text-orange-500 font-bold ml-auto">🔥×{playerStreak}</span>}
          </div>
          <Progress value={(playerHp / MAX_HP) * 100}
            className="h-3"
            style={{ ["--progress-color" as string]: playerHp > 40 ? "#3b82f6" : playerHp > 20 ? "#f59e0b" : "#ef4444" }}
          />
          <p className={cn("text-xs font-semibold text-right",
            playerHp > 40 ? "text-blue-600 dark:text-blue-400" : playerHp > 20 ? "text-amber-500" : "text-red-500"
          )}>
            {playerHp}/{MAX_HP}
          </p>
        </div>

        {/* AI Opponent */}
        <div className={cn("rounded-xl border-2 p-3 space-y-1.5 transition-all",
          hitAnimation === "ai" ? "border-green-500 bg-green-50 dark:bg-green-900/20 animate-pulse" : "border-red-400 dark:border-red-600")}>
          <div className="flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold text-red-600 dark:text-red-400">{t("reading.grammar.games.duel.opponent")}</span>
            {isAiThinking && <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
          </div>
          <Progress value={(aiHp / MAX_HP) * 100} className="h-3" />
          <p className={cn("text-xs font-semibold text-right",
            aiHp > 40 ? "text-red-500" : aiHp > 20 ? "text-amber-500" : "text-red-600"
          )}>
            {aiHp}/{MAX_HP}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("reading.grammar.games.score")}: <strong className="text-foreground">{score}</strong></span>
        {currentTopic && <Badge variant="outline" className="text-xs">{currentTopic.name}</Badge>}
      </div>

      {/* Question */}
      <div className="border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold">{currentQuestion.question}</p>
        <div className="space-y-2">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === currentQuestion.correctIndex;
            return (
              <button
                key={i}
                onClick={() => !isAnswered && handleAnswer(i)}
                disabled={isAnswered}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all",
                  isAnswered
                    ? isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-medium"
                      : isSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      : "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer active:bg-primary/10"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Round result feedback */}
      {isAnswered && roundResult && currentQuestion && (
        <AnswerFeedback
          isCorrect={roundResult === "player-wins"}
          explanation={
            roundResult === "ai-wins" && !isAnswered
              ? t("reading.grammar.games.duel.aiAnswered")
              : currentQuestion.explanation
          }
          points={roundResult === "player-wins" ? (playerStreak >= POWER_MOVE_THRESHOLD ? 200 : 100) : undefined}
        />
      )}
    </div>
  );
}
