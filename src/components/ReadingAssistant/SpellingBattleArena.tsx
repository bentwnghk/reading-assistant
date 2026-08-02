"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  Volume2,
  Loader2,
  Send,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Crown,
  Trophy,
  Flame,
  LogOut,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { useSpellingBattle } from "@/hooks/useSpellingBattle";
import { useSettingStore } from "@/store/setting";
import { speakWord, stopSpeaking, unlockAudio, isAudioUnlocked } from "@/utils/tts";
import { cn } from "@/utils/style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface SpellingBattleArenaProps {
  onExit: () => void;
}

function normalize(s: string): string {
  // Collapse internal whitespace so multi-word phrases reconstructed from
  // word-tile scramble (or typed in listen-type) match regardless of how many
  // spaces separated the words. Mirrors the server's normalizeWord and the
  // solo game's checkAnswer.
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// Mirror of the authoritative hint policy in `realtime/src/game/scoring.ts`.
// The server clamps any client-reported hint count to MAX_HINTS_PER_WORD and
// applies the escalating HINT_COSTS penalty, so the client UI must match to
// avoid showing the player a misleading "next hint" cost or remaining count.
// Keep both sides in sync.
const MAX_HINTS_PER_WORD = 3;
const HINT_COSTS: readonly number[] = [10, 20, 30];
function nextHintCost(usedSoFar: number): number | null {
  if (usedSoFar >= MAX_HINTS_PER_WORD) return null;
  return HINT_COSTS[Math.min(usedSoFar, HINT_COSTS.length - 1)];
}

/**
 * Optimistic local answer check — mirrors the server's `judgeAnswer` so client
 * feedback matches the authoritative server result.
 * - listen-type / scramble: whole-word equality (case- + whitespace-insensitive).
 *   For scramble the caller joins tiles with "" for single words or " " for
 *   phrases before passing `answer`; normalize() collapses any spacing diffs.
 * - fill-blanks: only the missing letters (NO trim — matches the solo game).
 */
function checkAnswer(
  gameMode: SpellingGameMode,
  wordStr: string,
  answer: string,
  blankPositions?: number[],
): boolean {
  if (gameMode === "fill-blanks") {
    if (!blankPositions || blankPositions.length === 0) return false;
    const missing = blankPositions.map((p) => wordStr[p].toLowerCase()).join("");
    return answer.toLowerCase() === missing;
  }
  return normalize(answer) === normalize(wordStr);
}

export function SpellingBattleArena({ onExit }: SpellingBattleArenaProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const battle = useSpellingBattle();
  const { ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy } =
    useSettingStore();

  const [userInput, setUserInput] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [optimisticCorrect, setOptimisticCorrect] = useState<boolean | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [inputType, setInputType] = useState<"password" | "text">("password");
  // scramble: tiles selected so far + their indices into shuffledLetters.
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [usedTileIndices, setUsedTileIndices] = useState<number[]>([]);
  // listen-type / fill-blanks: letter positions revealed by hints.
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  // Whether the Web Audio session is "running". On iOS Safari / mobile Chrome
  // the AudioContext must be resumed inside a user gesture before any audio can
  // play; until then the speaker button pulses and prompts for a tap. Once
  // running it stays running for the page lifetime, so every later word
  // auto-plays without another gesture.
  const [soundEnabled, setSoundEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const word = battle.currentWord;
  const myUserId = session?.user?.id;
  const gameMode: SpellingGameMode = word?.gameMode ?? "listen-type";
  // Scramble uses whole-word tiles for multi-word phrases (the entry's "word"
  // contains spaces) instead of individual characters, so phrases stay solvable.
  // Mirrors the solo game's scrambleByWord in VocabularySpelling.tsx.
  const scrambleByWord = gameMode === "scramble" && !!word && word.word.trim().includes(" ");

  const doSpeak = useCallback(
    async (text: string) => {
      await speakWord({
        word: text,
        voice: ttsVoice,
        speed: ttsPlaybackRate,
        mode,
        openaicompatibleApiKey,
        accessPassword,
        openaicompatibleApiProxy,
        audioRef,
        onStart: () => setIsTTSLoading(true),
        onEnd: () => setIsTTSLoading(false),
        onError: (msg) => toast.error(msg),
        // Auto-play attempted before the user has unlocked the session. The
        // always-visible speaker button is the persistent recovery affordance
        // (it never disappears), so we just flag the UI to pulse it rather
        // than relying on an ephemeral toast.
        onBlocked: () => setSoundEnabled(false),
      });
    },
    [ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy],
  );

  // Per-word lifecycle: reset state + speak the word (listen-type only) on a new word.
  useEffect(() => {
    if (!word) return;
    setUserInput("");
    setHasSubmitted(false);
    setHintsUsed(0);
    setShowDefinition(false);
    setOptimisticCorrect(null);
    setElapsedMs(0);
    setInputType("password");
    setSelectedLetters([]);
    setUsedTileIndices([]);
    setRevealedPositions([]);
    // Only listen-type reveals the word via audio; the other modes show a visual clue.
    // Auto-play only when the audio session is already unlocked — otherwise iOS
    // Safari blocks it. The speaker button (always visible) lets the user unlock
    // with one tap, after which all later words auto-play.
    const speakTimer =
      gameMode === "listen-type" && isAudioUnlocked()
        ? setTimeout(() => {
            void doSpeak(word.word);
          }, 250)
        : null;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      if (speakTimer) clearTimeout(speakTimer);
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.index]);

  // Per-word countdown ticker.
  useEffect(() => {
    if (!word) return;
    const startedAt = word.startedAt;
    tickerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.index, word?.startedAt]);

  const handleSubmit = useCallback(() => {
    if (!word || hasSubmitted) return;
    // Build the answer string per mode.
    let answer: string;
    if (gameMode === "scramble") {
      // For phrases, tiles are whole words and must be space-joined so the
      // normalized comparison matches the canonical word. Single words join
      // with "" (characters).
      answer = scrambleByWord ? selectedLetters.join(" ") : selectedLetters.join("");
    } else if (gameMode === "fill-blanks") {
      answer = userInput; // missing letters only — NO trim
    } else {
      answer = userInput.trim();
    }
    if (!answer) return;
    // Optimistic local feedback (server judges identically).
    setOptimisticCorrect(checkAnswer(gameMode, word.word, answer, word.blankPositions));
    setHasSubmitted(true);
    battle.submitAnswer({
      index: word.index,
      answer,
      submittedAt: Date.now(),
      hintsUsed,
    });
  }, [word, hasSubmitted, gameMode, scrambleByWord, userInput, selectedLetters, hintsUsed, battle]);

  const handleTileClick = useCallback((letter: string, index: number) => {
    setSelectedLetters((prev) => [...prev, letter]);
    setUsedTileIndices((prev) => [...prev, index]);
  }, []);

  const handleScrambleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && selectedLetters.length > 0) {
        setSelectedLetters((prev) => prev.slice(0, -1));
        setUsedTileIndices((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [selectedLetters.length, handleSubmit],
  );

  const handleHint = useCallback(() => {
    if (!word || hasSubmitted) return;
    // Hard cap: no more hints once MAX_HINTS_PER_WORD is reached. The server
    // also clamps, but we short-circuit here so the UI never lies about
    // granting a hint that the server will ignore.
    if (hintsUsed >= MAX_HINTS_PER_WORD) return;
    if (gameMode === "listen-type") {
      if (!showDefinition) {
        setShowDefinition(true);
        setHintsUsed((n) => n + 1);
        return;
      }
      // Reveal a random unrevealed letter position.
      const unrevealed = word.word.split("").map((_, idx) => idx).filter((idx) => !revealedPositions.includes(idx));
      if (unrevealed.length > 0) {
        const hintPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
      }
      setHintsUsed((n) => n + 1);
    } else if (gameMode === "fill-blanks") {
      // Reveal + auto-type the next missing letter.
      const blanks = word.blankPositions ?? [];
      const nextBlankIndex = userInput.length;
      if (nextBlankIndex < blanks.length) {
        const hintPos = blanks[nextBlankIndex];
        setRevealedPositions((prev) => [...prev, hintPos].sort((a, b) => a - b));
        setUserInput((prev) => prev + word.word[hintPos]);
      }
      setHintsUsed((n) => n + 1);
    } else if (gameMode === "scramble") {
      // Auto-place the next correct tile. For phrases the units are whole
      // words (split by whitespace); for single words they're characters.
      // Mirrors the solo game's scramble hint in VocabularySpelling.tsx.
      const tiles = word.shuffledLetters ?? [];
      const units = scrambleByWord ? word.word.trim().split(/\s+/) : word.word.split("");
      const nextCorrectUnit = units[selectedLetters.length];
      if (nextCorrectUnit) {
        const tileIndex = tiles.findIndex(
          (letter, idx) => letter.toLowerCase() === nextCorrectUnit.toLowerCase() && !usedTileIndices.includes(idx),
        );
        if (tileIndex !== -1) {
          setSelectedLetters((prev) => [...prev, tiles[tileIndex]]);
          setUsedTileIndices((prev) => [...prev, tileIndex]);
        }
      }
      setHintsUsed((n) => n + 1);
    }
  }, [word, hasSubmitted, gameMode, scrambleByWord, showDefinition, revealedPositions, userInput, selectedLetters, usedTileIndices, hintsUsed]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Best-effort unlock on mount. On desktop the AudioContext can often resume
  // without a fresh gesture (sticky activation), so sound works from the first
  // word. On iOS Safari resume() will reject until a real gesture — handled by
  // the listener + speaker button below.
  useEffect(() => {
    void unlockAudio().then((unlocked) => setSoundEnabled(unlocked));
  }, []);

  // iOS Safari / mobile Chrome: resume the AudioContext inside the user's
  // gestures (any tap in the arena). Once "running" it stays running for the
  // page lifetime, so every subsequent word auto-plays. unlockAudio() is a
  // no-op when already running, so it's cheap to call on every gesture.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onGesture = () => {
      void unlockAudio().then((unlocked) => {
        if (unlocked) setSoundEnabled(true);
      });
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("touchend", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchend", onGesture);
    };
  }, []);

  // ── Countdown overlay ────────────────────────────────────────────────────
  if (!word && battle.countdownN !== null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="text-6xl font-bold text-primary animate-pulse">{battle.countdownN}</div>
        <p className="text-muted-foreground">{t(`${M}.getReady`)}</p>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <LogOut className="h-4 w-4 mr-2" />
          {t(`${M}.leave`)}
        </Button>
      </div>
    );
  }

  if (!word) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t(`${M}.starting`)}</span>
      </div>
    );
  }

  const durationMs = word.durationMs;
  const timeRemainingMs = Math.max(0, durationMs - elapsedMs);
  const timePct = Math.min(100, (timeRemainingMs / durationMs) * 100);
  const timedOut = timeRemainingMs === 0 && !hasSubmitted;
  const myResult = battle.myLastResult;
  const showCorrect = hasSubmitted ? (myResult?.correct ?? optimisticCorrect ?? false) : null;
  // The current word is over for this player if they submitted, their local
  // timer expired, or the server resolved the word (covers the case where all
  // OTHER players submitted early). In any of these cases, reveal the answer.
  const wordEndedForThisWord = !!battle.wordEnded && battle.wordEnded.index === word.index;
  const locked = hasSubmitted || timedOut || wordEndedForThisWord;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Top bar: progress + exit */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">
          {t(`${M}.wordNOf`, { current: word.index + 1, total: word.total })}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Trophy className="h-3 w-3 text-yellow-500" />
            {myResult?.total ?? 0}
          </Badge>
          {(myResult?.streak ?? 0) >= 2 && (
            <Badge variant="outline" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {myResult?.streak}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <LogOut className="h-4 w-4 mr-1" />
          {t(`${M}.leave`)}
        </Button>
      </div>

      {/* Timer bar */}
      <div className="space-y-1">
        <Progress value={timePct} className="h-1.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {(timeRemainingMs / 1000).toFixed(1)}s
          </span>
          {hasSubmitted && <span className="text-muted-foreground">{t(`${M}.waitingOthers`)}</span>}
          {timedOut && <span className="text-destructive">{t(`${M}.timeUp`)}</span>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        {/* Main play area */}
        <Card>
          <CardContent className="space-y-4 py-6">
            {/* Mode badge */}
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                {t(`reading.glossary.spelling.modes.${gameMode}`)}
              </Badge>
            </div>

            {gameMode === "listen-type" && (
              <div className="space-y-4">
                {/* Listen + replay. The button is ALWAYS available (it is the
                    persistent recovery affordance). Until the audio session is
                    unlocked it pulses and prompts for a tap; one tap resumes
                    the AudioContext inside the gesture and all later words
                    auto-play. After that it replays the current word on tap. */}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className={cn(
                      "h-16 w-16 rounded-full",
                      !soundEnabled && "animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    onClick={async () => {
                      // Genuine user gesture — resume the AudioContext (iOS
                      // unlock) then speak the current word.
                      const unlocked = await unlockAudio();
                      setSoundEnabled(unlocked || isAudioUnlocked());
                      void doSpeak(word.word);
                    }}
                    title={t("reading.glossary.spelling.clickToHear")}
                  >
                    {isTTSLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Volume2 className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {soundEnabled
                      ? t("reading.glossary.spelling.clickToHear")
                      : t(`${M}.tapToEnableSound`)}
                  </span>
                </div>

                {/* Letter-position hints */}
                {revealedPositions.length > 0 && (
                  <div className="text-center font-mono text-2xl tracking-widest">
                    {word.word.split("").map((ch, idx) => (
                      <span key={idx}>{revealedPositions.includes(idx) ? ch : "_"}</span>
                    ))}
                  </div>
                )}

                {/* Definition hint */}
                {showDefinition && (word.englishDefinition || word.chineseDefinition) && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-center text-sm">
                    {word.englishDefinition && <p>{word.englishDefinition}</p>}
                    {word.chineseDefinition && <p className="text-muted-foreground">{word.chineseDefinition}</p>}
                    {word.partOfSpeech && <Badge variant="secondary" className="mt-1 text-xs">{word.partOfSpeech}</Badge>}
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type={inputType}
                    onFocus={() => setInputType("text")}
                    onChange={(e) => {
                      if (inputType === "password") setInputType("text");
                      setUserInput(e.target.value);
                    }}
                    value={userInput}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    disabled={locked}
                    placeholder={t("reading.glossary.spelling.typeAnswer")}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    {...({ writingsuggestions: "false" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    className={cn(
                      "text-center text-lg",
                      showCorrect === true && "border-green-500 bg-green-500/10",
                      showCorrect === false && "border-destructive bg-destructive/10",
                    )}
                  />
                  <Button onClick={handleSubmit} disabled={locked || !userInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {gameMode === "fill-blanks" && (
              <div className="space-y-4">
                {/* Definition clue (always shown — the word isn't spoken) */}
                {(word.englishDefinition || word.chineseDefinition) && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-center text-sm">
                    {word.englishDefinition && <p>{word.englishDefinition}</p>}
                    {word.chineseDefinition && <p className="text-muted-foreground">{word.chineseDefinition}</p>}
                    {word.partOfSpeech && <Badge variant="secondary" className="mt-1 text-xs">{word.partOfSpeech}</Badge>}
                  </div>
                )}

                {/* Masked word display: blanks show the Nth typed char / hint-revealed letter */}
                <div className="text-center font-mono text-2xl tracking-wider">
                  {word.word.split("").map((ch, idx) => {
                    const blanks = word.blankPositions ?? [];
                    const isBlank = blanks.includes(idx);
                    const isRevealed = revealedPositions.includes(idx);
                    const blankIdx = isBlank ? blanks.indexOf(idx) : -1;
                    const userChar = blankIdx !== -1 && blankIdx < userInput.length ? userInput[blankIdx] : null;
                    if (isBlank && !isRevealed && !userChar) {
                      return <span key={idx} className="inline-block w-6 h-8 mx-0.5 border-b-2 border-primary align-bottom" />;
                    }
                    return (
                      <span key={idx} className="inline-block w-6 h-8 mx-0.5">
                        {isRevealed ? ch : isBlank && userChar ? userChar : ch}
                      </span>
                    );
                  })}
                </div>

                {/* Missing-letters input */}
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type={inputType}
                    onFocus={() => setInputType("text")}
                    onChange={(e) => {
                      if (inputType === "password") setInputType("text");
                      setUserInput(e.target.value);
                    }}
                    value={userInput}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    disabled={locked}
                    placeholder={t("reading.glossary.spelling.typeMissing")}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    {...({ writingsuggestions: "false" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    className={cn(
                      "text-center text-lg",
                      showCorrect === true && "border-green-500 bg-green-500/10",
                      showCorrect === false && "border-destructive bg-destructive/10",
                    )}
                  />
                  <Button onClick={handleSubmit} disabled={locked || !userInput}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {gameMode === "scramble" && (
              <div className="space-y-4">
                {/* Definition clue (always shown — the word isn't spoken) */}
                {(word.englishDefinition || word.chineseDefinition) && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-center text-sm">
                    {word.englishDefinition && <p>{word.englishDefinition}</p>}
                    {word.chineseDefinition && <p className="text-muted-foreground">{word.chineseDefinition}</p>}
                    {word.partOfSpeech && <Badge variant="secondary" className="mt-1 text-xs">{word.partOfSpeech}</Badge>}
                  </div>
                )}

                {/* Selected letters so far */}
                <div className={cn(
                  "text-center font-mono text-2xl tracking-wider min-h-[2.5rem] p-2 border-b-2 border-dashed",
                  showCorrect === true && "border-green-500 text-green-600",
                  showCorrect === false && "border-destructive text-destructive",
                )}>
                  {selectedLetters.length > 0 ? (
                    scrambleByWord ? selectedLetters.join(" ") : selectedLetters.join("").toUpperCase()
                  ) : (
                    <span className="text-muted-foreground">
                      {scrambleByWord
                        ? Array.from({ length: word.word.trim().split(/\s+/).length })
                            .fill("___")
                            .join("   ")
                        : Array.from({ length: word.word.length }).fill("_").join(" ")}
                    </span>
                  )}
                </div>

                {/* Tile grid */}
                <div
                  className="flex flex-wrap justify-center gap-2 focus:outline-none"
                  onKeyDown={handleScrambleKeyDown}
                  tabIndex={0}
                >
                  {(word.shuffledLetters ?? []).map((letter, idx) => {
                    const isSelected = usedTileIndices.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => !isSelected && handleTileClick(letter, idx)}
                        disabled={isSelected || locked}
                        className={cn(
                          "text-lg font-semibold rounded-lg border-2 transition-all",
                          scrambleByWord ? "h-10 px-3" : "w-10 h-10",
                          isSelected
                            ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                            : "border-primary bg-primary/10 hover:bg-primary/20",
                        )}
                      >
                        {scrambleByWord ? letter : letter.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                {/* Clear + submit */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedLetters([]); setUsedTileIndices([]); }}
                    disabled={selectedLetters.length === 0 || locked}
                  >
                    {t("reading.glossary.spelling.clear")}
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={locked || selectedLetters.length === 0}>
                    <Send className="h-4 w-4 mr-1" />
                    {t(`${M}.submit`)}
                  </Button>
                </div>
              </div>
            )}

            {/* Feedback (shared) */}
            {locked && (
              <div className="flex items-center justify-center gap-2 text-sm">
                {showCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {t(`${M}.correct`)} · +{myResult?.pointsAwarded ?? 0}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">
                      {t(`${M}.answerWas`)} <span className="font-mono">{word.word}</span>
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Hint (shared, mode-aware). Hard cap of MAX_HINTS_PER_WORD per
                word with an escalating point cost (10/20/30). The badge shows
                remaining hints; the label previews the upcoming penalty. */}
            {!locked && (() => {
              const hintsRemaining = MAX_HINTS_PER_WORD - hintsUsed;
              const upcomingCost = nextHintCost(hintsUsed);
              const atCap = hintsRemaining <= 0;
              return (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHint}
                    disabled={atCap}
                    title={atCap ? t(`${M}.hintsExhausted`) : undefined}
                  >
                    <Lightbulb className="h-4 w-4 mr-1" />
                    {atCap
                      ? t(`${M}.hintsExhausted`)
                      : upcomingCost !== null
                        ? t(`${M}.useHintWithCost`, { cost: upcomingCost })
                        : t("reading.glossary.spelling.useHint")}
                    {!atCap && (
                      <Badge variant="secondary" className="ml-2 h-5 min-w-[1.25rem] px-1 text-[10px] tabular-nums">
                        {hintsRemaining}
                      </Badge>
                    )}
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Live ranking strip */}
        <RankingStrip ranking={battle.liveRanking} myUserId={myUserId} />
      </div>
    </div>
  );
}

function RankingStrip({
  ranking,
  myUserId,
}: {
  ranking: BattleRankingEntry[];
  myUserId?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card className="h-fit">
      <CardContent className="py-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Crown className="h-4 w-4 text-amber-500" />
          {t(`${M}.liveRank`)}
        </div>
        <div className="space-y-1.5">
          {ranking.length === 0 && (
            <p className="text-xs text-muted-foreground">{t(`${M}.awaitingFirst`)}</p>
          )}
          {ranking.map((entry) => {
            const isMe = entry.userId === myUserId;
            return (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-1.5",
                  isMe ? "border-primary/40 bg-primary/5" : "",
                )}
              >
                <span className="w-5 text-center text-sm font-bold">
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                </span>
                <Avatar className="h-6 w-6">
                  {entry.image && <AvatarImage src={entry.image} alt={entry.name ?? ""} />}
                  <AvatarFallback className="text-[10px]">
                    {(entry.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate text-xs">
                  {entry.name ?? t(`${M}.anonymous`)}
                  {isMe && <span className="ml-1 text-primary">({t(`${M}.you`)})</span>}
                </div>
                <span className="text-xs font-bold">{entry.total}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const M = "reading.glossary.spelling.multiplayer";
