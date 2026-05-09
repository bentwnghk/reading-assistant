"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, CheckCircle2, LoaderCircle } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GameBackButton, GameModeSelector, AnswerFeedback, GameStatRow } from "./GrammarGames";
import { logActivity } from "@/utils/activityLogger";

// ── Client-side Workshop challenge builder ────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Extracts function-word candidates from a pattern formula like
 * "Subject + has/have + Past Participle" → ["has", "have"]
 */
function extractPatternTokens(pattern: string): { label: string; variants: string[] }[] {
  const parts = pattern.split(/\s*\+\s*/);
  const tokens: { label: string; variants: string[] }[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("/")) {
      // "has/have", "was/were", "would/could/should" etc.
      tokens.push({ label: trimmed, variants: trimmed.split("/").map((v) => v.trim().toLowerCase()) });
    } else if (/^[a-z]/.test(trimmed) && trimmed.split(" ").length <= 3 && trimmed.length <= 20) {
      // lowercase short segments like "by", "to be", "being"
      tokens.push({ label: trimmed, variants: [trimmed.toLowerCase()] });
    }
  }
  return tokens;
}

function buildWorkshopChallenges(topics: GrammarTopic[]): GrammarWorkshopChallenge[] {
  const challenges: GrammarWorkshopChallenge[] = [];

  for (const topic of topics) {
    const patternTokens = extractPatternTokens(topic.pattern);
    if (patternTokens.length === 0) continue;

    const sentences = topic.examples.map((e) => e.sentence);

    for (const sentence of sentences.slice(0, 2)) {
      const words = sentence.split(/\s+/);
      let slotFound = false;
      const slots: { label: string; answer: string }[] = [];
      let template = sentence;

      for (const tokenGroup of patternTokens) {
        for (const variant of tokenGroup.variants) {
          const idx = words.findIndex((w) => w.toLowerCase().replace(/[,.]$/, "") === variant);
          if (idx !== -1) {
            const original = words[idx];
            const slot = { label: tokenGroup.label, answer: original };
            slots.push(slot);
            template = template.replace(original, `__[${tokenGroup.label}]__`);
            slotFound = true;
            break;
          }
        }
        if (slotFound) break; // one slot per challenge for client-side version
      }

      if (!slotFound || slots.length === 0) continue;

      // Build word bank: correct answer + alternatives from all pattern variants + distractors
      const allVariants = patternTokens.flatMap((g) => g.variants);
      const distractors = shuffleArray(allVariants.filter((v) => !slots.map(s => s.answer.toLowerCase()).includes(v))).slice(0, 4);
      const wordBank = shuffleArray([...slots.map((s) => s.answer), ...distractors.map((d) => d)]);

      challenges.push({
        topicId: topic.id,
        template,
        slots,
        wordBank,
        explanation: topic.explanation,
      });
    }
  }

  return shuffleArray(challenges);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export default function GrammarWorkshop({ onBack }: Props) {
  const { t } = useTranslation();
  const { grammarTopics, grammarWorkshopHighScore, setGrammarWorkshopHighScore, id, backup } = useReadingStore();
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
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (grammarTopics.length > 0) {
      setChallenges(buildWorkshopChallenges(grammarTopics));
    }
  }, [grammarTopics]);

  const loadChallenge = useCallback((index: number, list: GrammarWorkshopChallenge[]) => {
    const c = list[index];
    setCurrentChallenge(c);
    setTopicName(grammarTopics.find((t) => t.id === c.topicId)?.name ?? "");
    setFilledSlots(new Array(c.slots.length).fill(null));
    setUsedWords([]);
    setResult("pending");
  }, [grammarTopics]);

  const startGame = useCallback(() => {
    if (challenges.length === 0) return;
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    loadChallenge(0, challenges);
    setGameStatus("playing");
  }, [challenges, loadChallenge]);

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

    const isCorrect = currentChallenge.slots.every(
      (slot, i) => filledSlots[i]?.toLowerCase().replace(/[,.]$/, "") === slot.answer.toLowerCase().replace(/[,.]$/, "")
    );

    let pts = 0;
    if (isCorrect) {
      pts = 100;
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
    setTimeout(() => {
      const nextIndex = roundIndex + 1;
      if (nextIndex >= challenges.length) {
        setGameStatus("completed");
      } else {
        setRoundIndex(nextIndex);
        loadChallenge(nextIndex, challenges);
      }
    }, 1800);
  }, [currentChallenge, filledSlots, streak, roundIndex, challenges, loadChallenge]);

  useEffect(() => {
    if (gameStatus === "completed" && challenges.length > 0) {
      setGrammarWorkshopHighScore(score);
      logActivity("grammar_workshop_complete", { sessionId: id || undefined, score });
      const session = backup();
      const updated = update(id, session);
      if (!updated) save(session);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      const newChallenges = await generateGrammarWorkshopContent();
      if (newChallenges.length > 0) {
        setChallenges(shuffleArray(newChallenges));
      }
    } finally {
      setIsGenerating(false);
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
        <GameModeSelector mode={mode} onChange={setMode} />
        <div className="flex items-center justify-between text-sm text-muted-foreground border rounded-lg px-4 py-3">
          <span>{t("reading.grammar.games.rounds", { count: challenges.length })}</span>
          {grammarWorkshopHighScore > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              🏆 {grammarWorkshopHighScore}
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
      </div>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  if (gameStatus === "completed") {
    const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
    const isNewHigh = score > grammarWorkshopHighScore;
    return (
      <div className="space-y-5">
        <GameBackButton onBack={onBack} />
        <div className="text-center space-y-2 py-4">
          <div className="text-5xl font-black text-primary">{score}</div>
          <div className="text-sm text-muted-foreground">{t("reading.grammar.games.score")}</div>
          {isNewHigh && <Badge className="bg-amber-500 text-white">🏆 {t("reading.grammar.games.newBest")}</Badge>}
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

  // ── Playing ───────────────────────────────────────────────────────────────
  if (!currentChallenge) return null;
  const allFilled = filledSlots.every((s) => s !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <GameBackButton onBack={onBack} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {streak >= 2 && <span className="text-orange-500 font-bold">🔥 ×{streak}</span>}
          <span className="font-semibold">{score} pts</span>
        </div>
      </div>

      <Progress value={(roundIndex / challenges.length) * 100} className="h-1.5" />
      <div className="text-xs text-muted-foreground text-right">{roundIndex + 1} / {challenges.length}</div>

      {/* Topic */}
      <Badge variant="outline" className="text-xs">{topicName}</Badge>

      {/* Sentence with slots */}
      <div className="rounded-xl bg-muted/30 border p-4 leading-loose min-h-[64px]">
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
