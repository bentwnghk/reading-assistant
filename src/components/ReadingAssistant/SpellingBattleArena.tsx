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
import { speakWord } from "@/utils/tts";
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
  return s.trim().toLowerCase();
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const word = battle.currentWord;
  const myUserId = session?.user?.id;

  // Per-word lifecycle: reset state + speak the word when a new word arrives.
  useEffect(() => {
    if (!word) return;
    setUserInput("");
    setHasSubmitted(false);
    setHintsUsed(0);
    setShowDefinition(false);
    setOptimisticCorrect(null);
    setElapsedMs(0);
    // Speak the word shortly after mount (matches solo game pacing).
    const speakTimer = setTimeout(() => {
      void doSpeak(word.word);
    }, 250);
    // Focus the input.
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      clearTimeout(speakTimer);
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
      });
    },
    [ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy],
  );

  const handleSubmit = useCallback(() => {
    if (!word || hasSubmitted) return;
    const answer = userInput.trim();
    if (!answer) return;
    // Optimistic local feedback (server judges identically).
    setOptimisticCorrect(normalize(answer) === normalize(word.word));
    setHasSubmitted(true);
    battle.submitAnswer({
      index: word.index,
      answer,
      submittedAt: Date.now(),
      hintsUsed,
    });
  }, [word, hasSubmitted, userInput, hintsUsed, battle]);

  const handleHint = useCallback(() => {
    if (!word || hasSubmitted) return;
    setShowDefinition(true);
    setHintsUsed((n) => n + 1);
  }, [word, hasSubmitted]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
            {/* Listen + replay */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={() => void doSpeak(word.word)}
                disabled={isTTSLoading}
                title={t("reading.glossary.spelling.clickToHear")}
              >
                {isTTSLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <span className="text-xs text-muted-foreground">{t("reading.glossary.spelling.clickToHear")}</span>
            </div>

            {/* Definition hint */}
            {showDefinition && (word.englishDefinition || word.chineseDefinition) && (
              <div className="rounded-lg border bg-muted/40 p-3 text-center text-sm">
                {word.englishDefinition && <p>{word.englishDefinition}</p>}
                {word.chineseDefinition && (
                  <p className="text-muted-foreground">{word.chineseDefinition}</p>
                )}
                {word.partOfSpeech && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {word.partOfSpeech}
                  </Badge>
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="password"
                onFocus={(e) => {
                  (e.target as HTMLInputElement).type = "text";
                }}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                disabled={hasSubmitted || timedOut}
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
              <Button onClick={handleSubmit} disabled={hasSubmitted || timedOut || !userInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Feedback */}
            {hasSubmitted && (
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

            {/* Hint */}
            {!hasSubmitted && !timedOut && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={handleHint} disabled={showDefinition}>
                  <Lightbulb className="h-4 w-4 mr-1" />
                  {showDefinition ? t(`${M}.hintUsed`) : t("reading.glossary.spelling.useHint")}
                </Button>
              </div>
            )}
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
