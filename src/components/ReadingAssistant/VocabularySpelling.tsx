"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Volume2,
  Loader2,
  Play,
  RotateCcw,
  Lightbulb,
  Timer,
  Flame,
  Trophy,
  CheckCircle,
  XCircle,
  Shuffle,
  Keyboard,
  Eye,
  HelpCircle,
  Target,
  Crown,
  Star,
  Zap,
  Heart,
  Swords,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettingStore } from "@/store/setting";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { useBattleStore } from "@/store/battle";
import { logActivity } from "@/utils/activityLogger";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { parseError } from "@/utils/error";
import { cn } from "@/utils/style";
import { sortGlossaryByPriority, getWordStats, generateWordCountOptions } from "@/utils/vocabulary";
import { SpellingBattleFlow } from "./SpellingBattleFlow";
import GuideDialog from "@/components/Internal/GuideDialog";

interface VocabularySpellingProps {
  glossary: GlossaryEntry[];
  mergedRatings?: Record<string, GlossaryRating>;
  onWordResult?: (word: string, correct: boolean) => void;
  onComplete?: (results: { word: string; correct: boolean }[]) => void;
  /**
   * True when rendered outside the reading-session context (e.g. the
   * /vocabulary page). Suppresses the battle's "current session glossary"
   * source, since `useReadingStore().id` may still hold a stale session id
   * left over from a previous reading session.
   */
  disableSessionGlossary?: boolean;
}

type GameStatus = "setup" | "playing" | "completed";

const DIFFICULTY_CONFIG: Record<SpellingDifficulty, { timeLimits: Record<SpellingGameMode, number>; hintsAllowed: number; blankRatio: number }> = {
  easy: { timeLimits: { "listen-type": 30, scramble: 45, "fill-blanks": 30, mixed: 30 }, hintsAllowed: 5, blankRatio: 0.2 },
  medium: { timeLimits: { "listen-type": 20, scramble: 30, "fill-blanks": 20, mixed: 20 }, hintsAllowed: 3, blankRatio: 0.35 },
  hard: { timeLimits: { "listen-type": 12, scramble: 20, "fill-blanks": 12, mixed: 12 }, hintsAllowed: 1, blankRatio: 0.5 },
};

const MODE_ICONS: Record<SpellingGameMode, React.ReactNode> = {
  "listen-type": <Volume2 className="h-4 w-4" />,
  scramble: <Shuffle className="h-4 w-4" />,
  "fill-blanks": <Keyboard className="h-4 w-4" />,
  mixed: <HelpCircle className="h-4 w-4" />,
};

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

const TIER_CONFIG: Record<string, { emoji: string; icon: typeof Crown; color: string; ring: string; glow: string; badgeBg: string; particleColor: string; gradient: string }> = {
  master:    { emoji: "👑", icon: Crown, color: "text-amber-600 dark:text-amber-400", ring: "ring-4 ring-amber-400/60", glow: "shadow-amber-400/50", badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", particleColor: "#fbbf24", gradient: "linear-gradient(135deg, rgba(255,237,160,0.15) 0%, rgba(251,191,36,0.08) 50%, rgba(255,237,160,0.15) 100%)" },
  great:      { emoji: "🌟", icon: Star, color: "text-emerald-600 dark:text-emerald-400", ring: "ring-4 ring-emerald-400/50", glow: "shadow-emerald-400/40", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", particleColor: "#34d399", gradient: "linear-gradient(135deg, rgba(167,243,208,0.15) 0%, rgba(52,211,153,0.08) 50%, rgba(167,243,208,0.15) 100%)" },
  good:       { emoji: "💪", icon: Zap, color: "text-blue-600 dark:text-blue-400", ring: "ring-4 ring-blue-400/40", glow: "shadow-blue-400/30", badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", particleColor: "#60a5fa", gradient: "linear-gradient(135deg, rgba(191,219,254,0.15) 0%, rgba(96,165,250,0.08) 50%, rgba(191,219,254,0.15) 100%)" },
  keepGoing: { emoji: "❤️", icon: Heart, color: "text-rose-600 dark:text-rose-400", ring: "ring-4 ring-rose-400/30", glow: "shadow-rose-400/25", badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", particleColor: "#fb7185", gradient: "linear-gradient(135deg, rgba(254,205,211,0.15) 0%, rgba(251,113,133,0.08) 50%, rgba(254,205,211,0.15) 100%)" },
};

function SpellingResultScreen({
  score, accuracy, correctCount, totalCount, maxStreak, onPlayAgain,
}: {
  score: number; accuracy: number; correctCount: number; totalCount: number; maxStreak: number; onPlayAgain: () => void;
}) {
  const { t } = useTranslation();
  const tier = getResultTier(accuracy);
  const config = TIER_CONFIG[tier];
  const TierIcon = config.icon;
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnimateIn(true), 100); return () => clearTimeout(timer); }, []);

  return (
    <div className="space-y-5">
      <div className={cn("relative rounded-2xl border-2 p-6 text-center space-y-3 transition-all duration-700 overflow-hidden", config.ring, animateIn && "shadow-2xl " + config.glow, animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95")}
        style={{ background: config.gradient }}>
        {(tier === "master" || tier === "great") && <FloatingParticles color={config.particleColor} count={tier === "master" ? 20 : 12} />}
        <div className={cn("text-5xl transition-all duration-500 delay-200", animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50")}>{config.emoji}</div>
        <div className={cn("transition-all duration-500 delay-300", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className={cn("text-5xl font-black", config.color)}>{accuracy}%</div>
          <p className="text-sm text-muted-foreground mt-1">{score} {t("reading.glossary.spelling.points")}</p>
        </div>
        <div className={cn("transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", config.badgeBg)}><TierIcon className="h-3.5 w-3.5" />{t(`reading.glossary.spelling.resultTier.${tier}`)}</span>
        </div>
        {tier === "master" && <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />}
      </div>
      <div className={cn("border rounded-lg divide-y transition-all duration-500 [transition-delay:400ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <div className="flex justify-between px-5 py-3.5">
          <span className="text-muted-foreground text-sm">{t("reading.glossary.spelling.accuracy")}</span>
          <span className={cn("font-semibold text-sm", config.color)}>{accuracy}%</span>
        </div>
        <div className="flex justify-between px-5 py-3.5">
          <span className="text-muted-foreground text-sm">{t("reading.glossary.spelling.correctWords")}</span>
          <span className="font-semibold text-sm">{correctCount} / {totalCount}</span>
        </div>
        <div className="flex justify-between px-5 py-3.5">
          <span className="text-muted-foreground text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t("reading.glossary.spelling.maxStreak")}
          </span>
          <span className="font-semibold">{maxStreak}</span>
        </div>
      </div>
      <div className={cn("text-center transition-all duration-500 [transition-delay:600ms]", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <Button onClick={onPlayAgain} variant="outline" size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("reading.glossary.spelling.playAgain")}
        </Button>
      </div>
    </div>
  );
}

function VocabularySpelling({ glossary, mergedRatings, onWordResult, onComplete, disableSessionGlossary }: VocabularySpellingProps) {
  const { t } = useTranslation();
  const { ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy } = useSettingStore();
  const { id, spellingGameBestScore, setSpellingGameBestScore, glossaryRatings, backup } = useReadingStore();
  const { update, save } = useHistoryStore();
  const effectiveRatings = mergedRatings ?? glossaryRatings;
  const effectiveId = disableSessionGlossary ? undefined : id;

  const [gameStatus, setGameStatus] = useState<GameStatus>("setup");
  const [playMode, setPlayMode] = useState<"solo" | "battle">("solo");

  const shouldOpenBattle = useBattleStore((s) => s.shouldOpenBattle);
  const setShouldOpenBattle = useBattleStore((s) => s.setShouldOpenBattle);

  useEffect(() => {
    if (shouldOpenBattle) {
      setPlayMode("battle");
      setShouldOpenBattle(false);
    }
  }, [shouldOpenBattle, setShouldOpenBattle]);

  const [gameMode, setGameMode] = useState<SpellingGameMode>("listen-type");
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("medium");
  const [isTimed, setIsTimed] = useState(true);
  const [prioritizeHardWords, setPrioritizeHardWords] = useState(false);
  const [wordCountLimit, setWordCountLimit] = useState<number | "all">("all");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [correctCount, setCorrectCount] = useState(0);

  const [challenges, setChallenges] = useState<SpellingWordChallenge[]>([]);
  const [currentMode, setCurrentMode] = useState<SpellingGameMode>("listen-type");

  const [userInput, setUserInput] = useState("");
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [definitionsRevealed, setDefinitionsRevealed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const challengeRef = useRef<SpellingWordChallenge | null>(null);
  const revealedPositionsRef = useRef<number[]>([]);
  const correctWordsRef = useRef<Map<string, boolean>>(new Map());

  const currentChallenge = challenges[currentIndex];
  challengeRef.current = currentChallenge;
  const config = DIFFICULTY_CONFIG[difficulty];

  const wordStats = useMemo(() => {
    return getWordStats(glossary, effectiveRatings);
  }, [glossary, effectiveRatings]);

  const hasRatings = wordStats.hard > 0 || wordStats.medium > 0 || wordStats.easy > 0;

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateChallenge = useCallback((entry: GlossaryEntry, _mode: SpellingGameMode): SpellingWordChallenge => {
    const word = entry.word.toLowerCase();
    const letters = word.split("");
    const shuffledLetters = shuffleArray(letters);

    const blankCount = Math.max(1, Math.floor(word.length * config.blankRatio));
    const positions = shuffleArray([...Array(word.length).keys()]).slice(0, blankCount);
    const blankedWord = letters
      .map((letter, idx) => (positions.includes(idx) ? "_" : letter))
      .join("");

    return {
      word: entry.word,
      englishDefinition: entry.englishDefinition,
      chineseDefinition: entry.chineseDefinition,
      shuffledLetters,
      blankedWord,
      blankPositions: positions.sort((a, b) => a - b),
      revealedHints: [],
    };
  }, [config.blankRatio]);

  const startGame = useCallback(() => {
    let sortedGlossary = sortGlossaryByPriority(glossary, effectiveRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    if (wordCountLimit !== "all" && sortedGlossary.length > wordCountLimit) {
      sortedGlossary = sortedGlossary.slice(0, wordCountLimit);
    }
    const gameChallenges = sortedGlossary.map((entry) => {
      const actualMode = gameMode === "mixed" 
        ? (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)]
        : gameMode;
      return generateChallenge(entry, actualMode);
    });

    setChallenges(gameChallenges);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setHintsUsed(0);
    setHintsRemaining(config.hintsAllowed);
    const initialMode = gameMode === "mixed" 
      ? (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)]
      : gameMode;
    setTimeRemaining(config.timeLimits[initialMode]);
    setCorrectCount(0);
    setUserInput("");
    setSelectedLetters([]);
    setUsedIndices([]);
    setRevealedPositions([]);
    revealedPositionsRef.current = [];
    setDefinitionsRevealed(false);
    setShowFeedback(false);
    setGameStatus("playing");
    setCurrentMode(initialMode);
  }, [glossary, effectiveRatings, prioritizeHardWords, gameMode, config, generateChallenge, wordCountLimit]);

  useEffect(() => {
    if (gameStatus === "playing" && isTimed && !showFeedback) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsCorrect(false);
            setShowFeedback(true);
            setStreak(0);
            setTimeout(() => {
              if (currentIndex >= challenges.length - 1) {
                setGameStatus("completed");
              } else {
                const nextIndex = currentIndex + 1;
                setCurrentIndex(nextIndex);
                setUserInput("");
                setSelectedLetters([]);
                setUsedIndices([]);
                setRevealedPositions([]);
                revealedPositionsRef.current = [];
                setDefinitionsRevealed(false);
                setShowFeedback(false);

                if (gameMode === "mixed") {
                  const nextMode = (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)];
                  setCurrentMode(nextMode);
                  setTimeRemaining(config.timeLimits[nextMode]);
                } else {
                  setTimeRemaining(config.timeLimits[gameMode]);
                }

                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }, 1500);
            return config.timeLimits[currentMode];
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus, isTimed, showFeedback, currentIndex, challenges.length, gameMode, config.timeLimits, currentMode]);

  const moveToNext = useCallback(() => {
    if (currentIndex >= challenges.length - 1) {
      setGameStatus("completed");
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setUserInput("");
      setSelectedLetters([]);
      setUsedIndices([]);
      setRevealedPositions([]);
      revealedPositionsRef.current = [];
      setDefinitionsRevealed(false);
      setShowFeedback(false);

      if (gameMode === "mixed") {
        const nextMode = (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)];
        setCurrentMode(nextMode);
        setTimeRemaining(config.timeLimits[nextMode]);
      } else {
        setTimeRemaining(config.timeLimits[gameMode]);
      }

      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, challenges.length, gameMode, config.timeLimits]);

  const speakWord = useCallback(async (word: string) => {
    if (!word) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsTTSLoading(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      let url: string;
      if (mode === "local") {
        url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
        if (openaicompatibleApiKey) {
          headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
        }
      } else if (mode === "subscription") {
        url = "/api/ai/subscription/v1/audio/speech";
      } else {
        url = "/api/ai/openaicompatible/v1/audio/speech";
        if (accessPassword) {
          headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "tts-1",
          input: word,
          voice: ttsVoice,
          response_format: "mp3",
          speed: ttsPlaybackRate,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errorMsg = `TTS request failed (${response.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.status && parsed.error?.message) {
            errorMsg = `[${parsed.error.status}]: ${parsed.error.message}`;
          }
        } catch {}
        toast.error(errorMsg);
        return;
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audioRef.current = audio;

        audio.oncanplay = () => {
          audio.play().then(resolve).catch(reject);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(new Error("Audio element error"));
        };

        audio.src = audioUrl;
        audio.load();
      });
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setIsTTSLoading(false);
    }
  }, [ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]);

  const checkAnswer = useCallback(() => {
    if (!currentChallenge) return;

    let correct: boolean;

    if (currentMode === "fill-blanks") {
      // Do not trim — blank positions can include space characters, and trimming
      // would remove a trailing space typed by the user, causing a false negative.
      const normalizedInput = userInput.toLowerCase();
      const missingLetters = currentChallenge.blankPositions
        .map((pos) => currentChallenge.word[pos].toLowerCase())
        .join("");
      correct = normalizedInput === missingLetters;
    } else {
      const normalizedInput = userInput.toLowerCase().trim();
      const normalizedAnswer = currentChallenge.word.toLowerCase();
      correct = normalizedInput === normalizedAnswer;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak((prev) => Math.max(prev, newStreak));
      setCorrectCount((prev) => prev + 1);

      let points = 100;
      if (isTimed) {
        points += Math.floor((timeRemaining / config.timeLimits[currentMode]) * 50);
      }
      if (newStreak >= 3) {
        points += Math.floor(points * 0.1 * Math.min(newStreak - 2, 5));
      }
      points -= hintsUsed * 10;
      setScore((prev) => prev + Math.max(points, 10));
    } else {
      setStreak(0);
    }

    if (currentChallenge) {
      correctWordsRef.current.set(currentChallenge.word, correct);
    }

    setTimeout(() => moveToNext(), 1500);
  }, [currentChallenge, userInput, streak, isTimed, timeRemaining, config.timeLimits, hintsUsed, moveToNext, currentMode]);

  const handleHint = useCallback(() => {
    if (hintsRemaining <= 0 || !currentChallenge) return;

    setHintsRemaining((prev) => prev - 1);
    setHintsUsed((prev) => prev + 1);

    if (currentMode === "listen-type") {
      if (!definitionsRevealed) {
        setDefinitionsRevealed(true);
        return;
      }
      const unrevealed = currentChallenge.word
        .split("")
        .map((_, idx) => idx)
        .filter((idx) => !revealedPositions.includes(idx));

      if (unrevealed.length > 0) {
        const hintPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
      }
    } else if (currentMode === "fill-blanks") {
      const nextBlankIndex = userInput.length;
      if (nextBlankIndex < currentChallenge.blankPositions.length) {
        const hintPos = currentChallenge.blankPositions[nextBlankIndex];
        const hintLetter = currentChallenge.word[hintPos];
        revealedPositionsRef.current = [...revealedPositionsRef.current, hintPos].sort((a, b) => a - b);
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
        setUserInput((prev) => prev + hintLetter);
      }
    } else if (currentMode === "scramble") {
      const nextCorrectLetter = currentChallenge.word[selectedLetters.length];
      if (nextCorrectLetter) {
        const letterIndex = currentChallenge.shuffledLetters.findIndex(
          (letter, idx) => letter === nextCorrectLetter && !usedIndices.includes(idx)
        );
        if (letterIndex !== -1) {
          setSelectedLetters((prev) => [...prev, nextCorrectLetter]);
          setUserInput((prev) => prev + nextCorrectLetter);
          setUsedIndices((prev) => [...prev, letterIndex]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintsRemaining, currentChallenge, currentMode, selectedLetters, usedIndices, userInput]);

  const handleLetterClick = useCallback((letter: string, index: number) => {
    setSelectedLetters((prev) => [...prev, letter]);
    setUserInput((prev) => prev + letter);
    setUsedIndices((prev) => [...prev, index]);
  }, []);

  const handleScrambleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && selectedLetters.length > 0) {
        setSelectedLetters((prev) => prev.slice(0, -1));
        setUserInput((prev) => prev.slice(0, -1));
        setUsedIndices((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        checkAnswer();
      }
    },
    [selectedLetters, checkAnswer]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameStatus !== "playing" || showFeedback) return;

      if (e.key === "Enter" && currentMode !== "scramble") {
        checkAnswer();
      } else if (e.key === " " && e.ctrlKey) {
        e.preventDefault();
        handleHint();
      } else if (e.key === "Escape") {
        if (currentMode === "listen-type") {
          speakWord(currentChallenge?.word || "");
        }
      }
    },
    [gameStatus, showFeedback, currentMode, checkAnswer, handleHint, speakWord, currentChallenge]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gameStatus === "playing" && currentMode === "listen-type" && currentChallenge) {
      setTimeout(() => speakWord(currentChallenge.word), 300);
    }
  }, [currentIndex, gameStatus, currentMode, currentChallenge, speakWord]);

  useEffect(() => {
    if (gameStatus === "completed" && score > 0) {
      const accuracy = challenges.length > 0 ? Math.round((correctCount / challenges.length) * 100) : 0;
      setSpellingGameBestScore(score, accuracy);
      logActivity("spelling_complete", {
        sessionId: effectiveId || undefined,
        score,
        accuracy,
        details: { mode: gameMode, difficulty, streak: maxStreak },
      });

      if (onWordResult && correctWordsRef.current.size > 0) {
        for (const [word, correct] of correctWordsRef.current) {
          onWordResult(word, correct);
        }
      }

      if (onComplete && correctWordsRef.current.size > 0) {
        const results = Array.from(correctWordsRef.current.entries()).map(
          ([word, correct]) => ({ word, correct })
        );
        onComplete(results);
      }

      correctWordsRef.current.clear();
      
      if (id) {
        const session = backup();
        const updated = update(id, session);
        if (!updated) {
          save(session);
        }
      }
    }
  }, [gameStatus, score, setSpellingGameBestScore, effectiveId, id, backup, update, save, gameMode, difficulty, maxStreak, onWordResult, onComplete, correctCount, challenges]);

  if (glossary.length < 3) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.spelling.notEnoughWords")}</p>
      </div>
    );
  }

  if (playMode === "battle") {
    return (
      <SpellingBattleFlow
        defaultGlossarySessionId={disableSessionGlossary ? undefined : (id ?? undefined)}
        selectedWords={glossary.map((g) => g.word)}
        onWordResult={onWordResult}
        onComplete={onComplete}
        onExitToSolo={() => setPlayMode("solo")}
      />
    );
  }

  if (gameStatus === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-xl font-semibold">{t("reading.glossary.spelling.title")}</h3>
            <GuideDialog
              titleKey="reading.glossary.spelling.aboutTitle"
              introKey="reading.glossary.spelling.aboutDesc"
              itemsBaseKey="reading.glossary.spelling.help.items"
              items={[
                { key: "listen-type", icon: Volume2, bgClass: "bg-primary/10", iconClass: "text-primary" },
                { key: "scramble", icon: Shuffle, bgClass: "bg-primary/10", iconClass: "text-primary" },
                { key: "fill-blanks", icon: Keyboard, bgClass: "bg-primary/10", iconClass: "text-primary" },
                { key: "mixed", icon: HelpCircle, bgClass: "bg-primary/10", iconClass: "text-primary" },
              ]}
              tipContentKey="reading.glossary.spelling.help.tip"
            />
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div>
            <label className="text-sm font-medium mb-3 block">
              {t("reading.glossary.spelling.playMode.heading")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Solo Practice — selected state (this screen is the solo setup) */}
              <div
                aria-pressed="true"
                className="relative rounded-xl border-2 border-primary bg-primary/10 p-4 text-left"
              >
                <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 mb-2">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-primary">
                  {t("reading.glossary.spelling.playMode.solo")}
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground mt-0.5">
                  {t("reading.glossary.spelling.playMode.soloDesc")}
          </div>
          <p className="text-muted-foreground text-sm">
            {t("reading.glossary.spelling.subtitle", { count: glossary.length })}
          </p>
        </div>

              {/* Multiplayer Battle — bold & gamified entry */}
              <button
                type="button"
                onClick={() => setPlayMode("battle")}
                className="relative rounded-xl border-2 border-fuchsia-400/50 dark:border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-background p-4 text-left transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-fuchsia-500/20 hover:border-fuchsia-400 dark:hover:border-fuchsia-400"
              >
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {t("reading.glossary.spelling.playMode.live")}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-500/15 mb-2">
                  <Swords className="h-5 w-5 text-fuchsia-500" />
                </div>
                <div className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                  {t("reading.glossary.spelling.multiplayer.title")}
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground mt-0.5">
                  {t("reading.glossary.spelling.multiplayer.subtitle")}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">
              {t("reading.glossary.spelling.selectMode")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["listen-type", "scramble", "fill-blanks", "mixed"] as SpellingGameMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all",
                    gameMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {MODE_ICONS[mode]}
                  <span className="text-sm">{t(`reading.glossary.spelling.modes.${mode}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">
              {t("reading.glossary.spelling.selectDifficulty")}
            </label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as SpellingDifficulty[]).map((d) => (
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
                  {t(`reading.glossary.spelling.difficulty.${d}`)}
                </button>
              ))}
            </div>
          </div>

          {hasRatings && (
            <div className="space-y-2">
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
            </div>
          )}

          {generateWordCountOptions(glossary.length).length > 0 && (
            <div>
              <label className="text-sm font-medium mb-3 block">
                {t("reading.glossary.spelling.selectWordCount")}
              </label>
              <div className="flex flex-wrap gap-2">
                {generateWordCountOptions(glossary.length).map((count) => (
                  <button
                    key={count}
                    onClick={() => setWordCountLimit(count)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border-2 transition-all text-sm font-medium",
                      wordCountLimit === count
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {count}
                  </button>
                ))}
                <button
                  onClick={() => setWordCountLimit("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border-2 transition-all text-sm font-medium",
                    wordCountLimit === "all"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {t("reading.glossary.allWords")}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t("reading.glossary.spelling.timeChallenge")}</span>
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

          <Button onClick={startGame} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            {t("reading.glossary.spelling.startGame")}
          </Button>

          {spellingGameBestScore > 0 && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{t("reading.glossary.spelling.bestScore")}</span>
                <span className="text-lg font-bold text-primary">{spellingGameBestScore}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameStatus === "completed") {
    const percentage = Math.round((correctCount / challenges.length) * 100);

    return (
      <div className="py-8">
        <SpellingResultScreen
          score={score}
          accuracy={percentage}
          correctCount={correctCount}
          totalCount={challenges.length}
          maxStreak={maxStreak}
          onPlayAgain={() => setGameStatus("setup")}
        />
      </div>
    );
  }

  if (!currentChallenge) return null;

  const timerColor =
    timeRemaining <= 3 ? "text-red-500" : timeRemaining <= 7 ? "text-yellow-500" : "text-foreground";

  const displayHint = currentMode === "listen-type"
    ? currentChallenge.word
        .split("")
        .map((char, idx) => (revealedPositions.includes(idx) ? char : "_"))
        .join(" ")
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {challenges.length}
            </span>
            {streak >= 2 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-semibold">{streak}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hintsRemaining > 0 && (
              <button
                onClick={handleHint}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                title={t("reading.glossary.spelling.useHint")}
              >
                <Lightbulb className="h-4 w-4" />
                {hintsRemaining}
              </button>
            )}
            {isTimed && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", timerColor)}>
                <Timer className="h-4 w-4" />
                {timeRemaining}s
              </div>
            )}
          </div>
        </div>

        <div className="w-full h-2 bg-muted rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / challenges.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-md bg-card border rounded-xl p-6 relative overflow-hidden">
        <div className="text-center mb-4">
          <span className="text-xs px-2 py-1 bg-muted rounded-full">
            {t(`reading.glossary.spelling.modes.${currentMode}`)}
          </span>
        </div>

        {currentMode === "listen-type" && (
          <div className="space-y-6">
            <div className="text-center">
              <button
                onClick={() => speakWord(currentChallenge.word)}
                disabled={isTTSLoading}
                className="p-4 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                {isTTSLoading ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Volume2 className="h-8 w-8 text-primary" />
                )}
              </button>
              <p className="text-sm text-muted-foreground mt-2">
                {t("reading.glossary.spelling.clickToHear")}
              </p>
            </div>

            {revealedPositions.length > 0 && (
              <div className="text-center font-mono text-2xl tracking-widest">
                {displayHint}
              </div>
            )}

            {definitionsRevealed && (
              <div className="text-sm text-muted-foreground text-center space-y-1">
                <div><Eye className="h-4 w-4 inline mr-1" />{currentChallenge.englishDefinition}</div>
                <div className="font-noto-sans-tc">{currentChallenge.chineseDefinition}</div>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t("reading.glossary.spelling.typeAnswer")}
              className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              {...({ writingsuggestions: "false" } as React.InputHTMLAttributes<HTMLInputElement>)}
              autoFocus
              disabled={showFeedback}
            />
          </div>
        )}

        {currentMode === "scramble" && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <div><Eye className="h-4 w-4 inline mr-1" />{currentChallenge.englishDefinition}</div>
              <div className="font-noto-sans-tc">{currentChallenge.chineseDefinition}</div>
            </div>

            <div className="text-center font-mono text-2xl tracking-wider min-h-[2.5rem] p-2 border-b-2 border-dashed">
              {userInput || (
                <span className="text-muted-foreground">
                  {Array.from({ length: currentChallenge.word.length }).fill("_").join(" ")}
                </span>
              )}
            </div>

            <div
              className="flex flex-wrap justify-center gap-2"
              onKeyDown={handleScrambleKeyDown}
              tabIndex={0}
            >
              {currentChallenge.shuffledLetters.map((letter, idx) => {
                const isSelected = usedIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => !isSelected && handleLetterClick(letter, idx)}
                    disabled={isSelected || showFeedback}
                    className={cn(
                      "w-10 h-10 text-lg font-semibold rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                        : "border-primary bg-primary/10 hover:bg-primary/20"
                    )}
                  >
                    {letter.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedLetters([]);
                  setUserInput("");
                  setUsedIndices([]);
                }}
                disabled={selectedLetters.length === 0 || showFeedback}
              >
                {t("reading.glossary.spelling.clear")}
              </Button>
            </div>
          </div>
        )}

        {currentMode === "fill-blanks" && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <div><Eye className="h-4 w-4 inline mr-1" />{currentChallenge.englishDefinition}</div>
              <div className="font-noto-sans-tc">{currentChallenge.chineseDefinition}</div>
            </div>

            <div className="text-center font-mono text-2xl tracking-wider">
              {currentChallenge.word.split("").map((char, idx) => {
                const isBlank = currentChallenge.blankPositions.includes(idx);
                const isRevealed = revealedPositions.includes(idx);
                const blankIndex = currentChallenge.blankPositions.indexOf(idx);
                const userChar = blankIndex !== -1 && blankIndex < userInput.length 
                  ? userInput[blankIndex] 
                  : null;

                if (isBlank && !isRevealed && !userChar) {
                  return (
                    <span
                      key={idx}
                      className="inline-block w-6 h-8 mx-0.5 border-b-2 border-primary"
                    />
                  );
                }

                return (
                  <span key={idx} className="inline-block w-6 h-8 mx-0.5">
                    {isRevealed ? char : isBlank && userChar ? userChar : char}
                  </span>
                );
              })}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t("reading.glossary.spelling.typeMissing")}
              className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              {...({ writingsuggestions: "false" } as React.InputHTMLAttributes<HTMLInputElement>)}
              autoFocus
              disabled={showFeedback}
            />
          </div>
        )}

        {!showFeedback && currentMode !== "scramble" && (
          <Button onClick={checkAnswer} className="w-full mt-4" disabled={!userInput.trim()}>
            {t("reading.glossary.spelling.submit")}
          </Button>
        )}

        {!showFeedback && currentMode === "scramble" && (
          <Button
            onClick={checkAnswer}
            className="w-full mt-4"
            disabled={selectedLetters.length !== currentChallenge.word.length}
          >
            {t("reading.glossary.spelling.submit")}
          </Button>
        )}
      </div>

      {showFeedback && (
        <div
          className={cn(
            "w-full max-w-md p-4 rounded-xl flex items-center justify-center gap-3",
            isCorrect
              ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500"
              : "bg-red-100 dark:bg-red-900/30 border-2 border-red-500"
          )}
        >
          {isCorrect ? (
            <>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {t("reading.glossary.quiz.correct")}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <span className="text-2xl font-bold text-foreground">
                {currentChallenge.word.toUpperCase()}
              </span>
              <span className="text-lg text-muted-foreground font-noto-sans-tc">
                ({currentChallenge.chineseDefinition})
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("reading.glossary.spelling.score")}:</span>
        <span className="font-semibold text-foreground">{score}</span>
        <span className="mx-2">|</span>
        <span className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-orange-500" />
          {streak}
        </span>
      </div>
    </div>
  );
}

export default VocabularySpelling;
