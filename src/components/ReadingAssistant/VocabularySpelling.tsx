"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { cn } from "@/utils/style";

interface VocabularySpellingProps {
  glossary: GlossaryEntry[];
}

type GameStatus = "setup" | "playing" | "completed";

const DIFFICULTY_CONFIG: Record<SpellingDifficulty, { timeLimit: number; hintsAllowed: number; blankRatio: number }> = {
  easy: { timeLimit: 30, hintsAllowed: 5, blankRatio: 0.2 },
  medium: { timeLimit: 20, hintsAllowed: 3, blankRatio: 0.35 },
  hard: { timeLimit: 12, hintsAllowed: 1, blankRatio: 0.5 },
};

const MODE_ICONS: Record<SpellingGameMode, React.ReactNode> = {
  "listen-type": <Volume2 className="h-4 w-4" />,
  scramble: <Shuffle className="h-4 w-4" />,
  "fill-blanks": <Keyboard className="h-4 w-4" />,
  mixed: <HelpCircle className="h-4 w-4" />,
};

function VocabularySpelling({ glossary }: VocabularySpellingProps) {
  const { t } = useTranslation();
  const { ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy } = useSettingStore();

  const [gameStatus, setGameStatus] = useState<GameStatus>("setup");
  const [gameMode, setGameMode] = useState<SpellingGameMode>("listen-type");
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("medium");
  const [isTimed, setIsTimed] = useState(true);

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
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const challengeRef = useRef<SpellingWordChallenge | null>(null);

  const currentChallenge = challenges[currentIndex];
  challengeRef.current = currentChallenge;
  const config = DIFFICULTY_CONFIG[difficulty];

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
      definition: entry.englishDefinition,
      shuffledLetters,
      blankedWord,
      blankPositions: positions.sort((a, b) => a - b),
      revealedHints: [],
    };
  }, [config.blankRatio]);

  const startGame = useCallback(() => {
    const shuffledGlossary = shuffleArray(glossary);
    const gameChallenges = shuffledGlossary.map((entry) => {
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
    setTimeRemaining(config.timeLimit);
    setCorrectCount(0);
    setUserInput("");
    setSelectedLetters([]);
    setRevealedPositions([]);
    setShowFeedback(false);
    setGameStatus("playing");
    setCurrentMode(gameMode === "mixed" ? gameChallenges[0].word ? "listen-type" : gameMode : gameMode);

    if (gameMode === "mixed" && gameChallenges.length > 0) {
      const firstMode = (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)];
      setCurrentMode(firstMode);
    }
  }, [glossary, gameMode, config, generateChallenge]);

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
                setRevealedPositions([]);
                setShowFeedback(false);
                setTimeRemaining(config.timeLimit);

                if (gameMode === "mixed") {
                  const nextMode = (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)];
                  setCurrentMode(nextMode);
                }

                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }, 1500);
            return config.timeLimit;
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
  }, [gameStatus, isTimed, showFeedback, currentIndex, challenges.length, gameMode, config.timeLimit]);

  const moveToNext = useCallback(() => {
    if (currentIndex >= challenges.length - 1) {
      setGameStatus("completed");
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setUserInput("");
      setSelectedLetters([]);
      setRevealedPositions([]);
      setShowFeedback(false);
      setTimeRemaining(config.timeLimit);

      if (gameMode === "mixed") {
        const nextMode = (["listen-type", "scramble", "fill-blanks"] as SpellingGameMode[])[Math.floor(Math.random() * 3)];
        setCurrentMode(nextMode);
      }

      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, challenges.length, gameMode, config.timeLimit]);

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
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed (${response.status})`);
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
      console.error("TTS error:", error);
    } finally {
      setIsTTSLoading(false);
    }
  }, [ttsVoice, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]);

  const checkAnswer = useCallback(() => {
    if (!currentChallenge) return;

    const normalizedInput = userInput.toLowerCase().trim();
    const normalizedAnswer = currentChallenge.word.toLowerCase();
    const correct = normalizedInput === normalizedAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak((prev) => Math.max(prev, newStreak));
      setCorrectCount((prev) => prev + 1);

      let points = 100;
      if (isTimed) {
        points += Math.floor((timeRemaining / config.timeLimit) * 50);
      }
      if (newStreak >= 3) {
        points += Math.floor(points * 0.1 * Math.min(newStreak - 2, 5));
      }
      points -= hintsUsed * 10;
      setScore((prev) => prev + Math.max(points, 10));
    } else {
      setStreak(0);
    }

    setTimeout(() => moveToNext(), 1500);
  }, [currentChallenge, userInput, streak, isTimed, timeRemaining, config.timeLimit, hintsUsed, moveToNext]);

  const handleHint = useCallback(() => {
    if (hintsRemaining <= 0 || !currentChallenge) return;

    setHintsRemaining((prev) => prev - 1);
    setHintsUsed((prev) => prev + 1);

    if (currentMode === "listen-type") {
      const unrevealed = currentChallenge.word
        .split("")
        .map((_, idx) => idx)
        .filter((idx) => !revealedPositions.includes(idx));

      if (unrevealed.length > 0) {
        const hintPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
      }
    } else if (currentMode === "fill-blanks") {
      const unrevealedBlanks = currentChallenge.blankPositions.filter(
        (pos) => !revealedPositions.includes(pos)
      );
      if (unrevealedBlanks.length > 0) {
        const hintPos = unrevealedBlanks[0];
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
      }
    }
  }, [hintsRemaining, currentChallenge, currentMode, revealedPositions]);

  const handleLetterClick = useCallback((letter: string, _index: number) => {
    setSelectedLetters((prev) => [...prev, letter]);
    setUserInput((prev) => prev + letter);
  }, []);

  const handleScrambleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && selectedLetters.length > 0) {
        setSelectedLetters((prev) => prev.slice(0, -1));
        setUserInput((prev) => prev.slice(0, -1));
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

  if (glossary.length < 3) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.spelling.notEnoughWords")}</p>
      </div>
    );
  }

  if (gameStatus === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">{t("reading.glossary.spelling.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("reading.glossary.spelling.subtitle", { count: glossary.length })}
          </p>
        </div>

        <div className="w-full max-w-md space-y-6">
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
        </div>
      </div>
    );
  }

  if (gameStatus === "completed") {
    const percentage = Math.round((correctCount / challenges.length) * 100);
    const getScoreColor = () => {
      if (percentage >= 80) return "text-green-600 dark:text-green-400";
      if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    };

    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Trophy className="h-16 w-16 text-yellow-500" />
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">{t("reading.glossary.spelling.gameComplete")}</h3>
          <p className={cn("text-4xl font-bold", getScoreColor())}>{score}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("reading.glossary.spelling.points")}</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">{t("reading.glossary.spelling.accuracy")}</span>
            <span className={cn("font-semibold", getScoreColor())}>{percentage}%</span>
          </div>
          <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">{t("reading.glossary.spelling.correctWords")}</span>
            <span className="font-semibold">
              {correctCount} / {challenges.length}
            </span>
          </div>
          <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              {t("reading.glossary.spelling.maxStreak")}
            </span>
            <span className="font-semibold">{maxStreak}</span>
          </div>
        </div>

        <Button onClick={() => setGameStatus("setup")} variant="outline" size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("reading.glossary.spelling.playAgain")}
        </Button>
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
        {showFeedback && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center z-10",
              isCorrect ? "bg-green-500/20" : "bg-red-500/20"
            )}
          >
            {isCorrect ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">{currentChallenge.word}</p>
              </div>
            )}
          </div>
        )}

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

            <div className="text-sm text-muted-foreground text-center">
              <Eye className="h-4 w-4 inline mr-1" />
              {currentChallenge.definition}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t("reading.glossary.spelling.typeAnswer")}
              className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              autoFocus
              disabled={showFeedback}
            />
          </div>
        )}

        {currentMode === "scramble" && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground text-center mb-4">
              <Eye className="h-4 w-4 inline mr-1" />
              {currentChallenge.definition}
            </div>

            <div className="text-center font-mono text-2xl tracking-wider min-h-[2.5rem] p-2 border-b-2 border-dashed">
              {userInput || <span className="text-muted-foreground">_ _ _ _ _ _</span>}
            </div>

            <div
              className="flex flex-wrap justify-center gap-2"
              onKeyDown={handleScrambleKeyDown}
              tabIndex={0}
            >
              {currentChallenge.shuffledLetters.map((letter, idx) => {
                const isSelected = selectedLetters.length > idx && selectedLetters[idx] !== undefined;
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
            <div className="text-sm text-muted-foreground text-center mb-4">
              <Eye className="h-4 w-4 inline mr-1" />
              {currentChallenge.definition}
            </div>

            <div className="text-center font-mono text-2xl tracking-wider">
              {currentChallenge.word.split("").map((char, idx) => {
                const isBlank = currentChallenge.blankPositions.includes(idx);
                const isRevealed = revealedPositions.includes(idx);
                const userChar = userInput[idx - currentChallenge.blankPositions.indexOf(idx)] || 
                  (isBlank && isRevealed ? char : null);

                if (isBlank && !isRevealed) {
                  return (
                    <span
                      key={idx}
                      className="inline-block w-6 h-8 mx-0.5 border-b-2 border-primary"
                    />
                  );
                }
                return (
                  <span key={idx} className="inline-block w-6 h-8 mx-0.5">
                    {isRevealed ? char : userChar || char}
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
