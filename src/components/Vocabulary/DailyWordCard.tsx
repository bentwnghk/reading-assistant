"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVocabularyStore } from "@/store/vocabulary";
import { useSettingStore } from "@/store/setting";
import { useDailyWordStore, contentKey, imageStoreKey } from "@/store/dailyWord";
import { useDailyWordContent } from "@/hooks/useDailyWordContent";
import {
  computeStreak,
  dayKeyOf,
  diffDays,
  milestoneReached,
  parseDayKey,
  pickDailyWord,
  shiftDayKey,
} from "@/utils/dailyWord";
import { speakWord, unlockAudio, stopSpeaking } from "@/utils/tts";
import { cn } from "@/utils/style";

const MAX_AHEAD = 30;
const MAX_BACK = 365;
const NO_ASSIST = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
} as const;

function useTodayKey(): string {
  const [key, setKey] = useState(() => dayKeyOf(new Date()));
  useEffect(() => {
    const tick = () => setKey(dayKeyOf(new Date()));
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return key;
}

function useDailyWordState() {
  const words = useVocabularyStore((s) => s.words);
  const todayKey = useTodayKey();
  const days = useDailyWordStore((s) => s.days);
  const load = useDailyWordStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const candidates = useMemo(
    () => words.filter((w) => w.entryType !== "phrase" && !!w.word.trim()),
    [words]
  );

  /** Past days keep the word they were shown; everything else is computed. */
  const wordFor = (dayKey: string) => {
    const pinnedWord = days[dayKey]?.word;
    if (pinnedWord) {
      const hit = candidates.find((c) => c.word === pinnedWord);
      if (hit) return hit;
    }
    return pickDailyWord(candidates, dayKey);
  };

  const streak = useMemo(
    () =>
      computeStreak(
        Object.entries(days)
          .filter(([, v]) => v.learnedAt && v.onTime)
          .map(([k]) => k),
        todayKey
      ),
    [days, todayKey]
  );

  return { days, todayKey, candidates, wordFor, streak };
}

export function DailyWordCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { days, todayKey, candidates, wordFor, streak } = useDailyWordState();
  const todayWord = wordFor(todayKey);
  const pin = useDailyWordStore((s) => s.pin);
  const loaded = useDailyWordStore((s) => s.loaded);

  // Pin only after the server's history has loaded, so another device's pick wins.
  useEffect(() => {
    if (loaded && todayWord && !days[todayKey]) pin(todayKey, todayWord.word);
  }, [loaded, todayWord, todayKey, days, pin]);

  if (candidates.length === 0 || !todayWord) return null;
  const done = !!days[todayKey]?.learnedAt;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("vocabulary.dailyWord.cardHint")}
        className={cn(
          "col-span-2 sm:col-span-1 relative overflow-hidden text-left rounded-lg border p-3 cursor-pointer",
          "bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30",
          "border-amber-300/70 dark:border-amber-700/50 hover:shadow-md active:scale-[0.98] transition-all",
          !done && "ring-2 ring-amber-400/70"
        )}
      >
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-1">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            {t("vocabulary.dailyWord.title")}
          </span>
          {streak.current > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-500">
              <Flame className="h-3.5 w-3.5" />
              {streak.current}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold truncate text-emerald-800 dark:text-emerald-300">
          {todayWord.word}
        </div>
        <div className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground">
          {done ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              {t("vocabulary.dailyWord.doneToday")}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t("vocabulary.dailyWord.tapToLearn")}
            </>
          )}
        </div>
      </button>
      {open && <DailyWordDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

function DailyWordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const { days, todayKey, wordFor, streak } = useDailyWordState();
  const { ensure, error } = useDailyWordContent();
  const learn = useDailyWordStore((s) => s.learn);
  const setNote = useDailyWordStore((s) => s.setNote);
  const pin = useDailyWordStore((s) => s.pin);
  const loaded = useDailyWordStore((s) => s.loaded);
  const ensureImage = useDailyWordStore((s) => s.ensureImage);
  const images = useDailyWordStore((s) => s.images);
  const imageStatus = useDailyWordStore((s) => s.imageStatus);
  const { mode, accessPassword, ttsModel, ttsVoice, ttsPlaybackRate, openaicompatibleApiKey, openaicompatibleApiProxy } =
    useSettingStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const dayKey = shiftDayKey(todayKey, offset);
  const entry = wordFor(dayKey);
  const content = useDailyWordStore((s) =>
    entry ? s.content[contentKey(entry.word)] : undefined
  );
  const learned = days[dayKey]?.learnedAt ? days[dayKey] : undefined;
  const date = parseDayKey(dayKey);
  const locale = i18n.language || "en-US";
  const weekday = date.toLocaleDateString(locale, { weekday: "long" });
  const month = date.toLocaleDateString(locale, { month: "long" });
  const kind = offset === 0 ? "today" : offset < 0 ? "past" : "future";
  const learnedCount = Object.values(days).filter((d) => d.learnedAt).length;

  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!entry) return;
    if (loaded && offset <= 0 && !days[dayKey]) pin(dayKey, entry.word);
    if (content) return;
    let cancelled = false;
    setLoading(true);
    ensure(entry).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.word, retry, loaded]);

  // Warm tomorrow's page so "next" feels instant.
  useEffect(() => {
    if (!content || offset >= MAX_AHEAD) return;
    const next = wordFor(shiftDayKey(dayKey, 1));
    if (next) void ensure(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dayKey]);

  // Real illustrations: generated once per word, then served from the DB.
  useEffect(() => {
    if (!entry || !content) return;
    void ensureImage(entry.word, "mascot");
    void ensureImage(entry.word, "scene");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.word, !!content]);

  useEffect(
    () => () => {
      stopSpeaking();
      void useDailyWordStore.getState().flushNotes();
    },
    []
  );

  const speak = async (text: string) => {
    await unlockAudio();
    await speakWord({
      word: text,
      model: ttsModel,
      voice: ttsVoice,
      speed: ttsPlaybackRate,
      mode,
      openaicompatibleApiKey,
      openaicompatibleApiProxy,
      accessPassword,
      audioRef,
      onError: (m) => toast.error(m),
    });
  };

  const celebrate = (big: boolean) =>
    confetti({
      particleCount: big ? 220 : 90,
      spread: big ? 110 : 70,
      origin: { y: 0.65 },
      disableForReducedMotion: true,
    });

  const handleLearned = async () => {
    if (!entry || learned) return;
    const onTime = offset === 0;
    try {
      await learn(dayKey, entry.word, onTime);
    } catch {
      return;
    }
    const newStreak = computeStreak(
      Object.entries(useDailyWordStore.getState().days)
        .filter(([, v]) => v.learnedAt && v.onTime)
        .map(([k]) => k),
      todayKey
    ).current;
    const milestone = onTime ? milestoneReached(newStreak) : null;
    celebrate(!!milestone);
    if (milestone) {
      toast.success(t("vocabulary.dailyWord.milestone", { count: milestone }), { duration: 6000 });
    } else if (onTime) {
      toast.success(t("vocabulary.dailyWord.streakToast", { count: newStreak }));
    } else if (kind === "future") {
      toast.success(t("vocabulary.dailyWord.aheadToast"));
    } else {
      toast.success(t("vocabulary.dailyWord.catchUpToast"));
    }
  };

  const startOfWeek = shiftDayKey(dayKey, -date.getDay());
  const strip = Array.from({ length: 7 }, (_, i) => shiftDayKey(startOfWeek, i));

  const go = (next: number) => {
    stopSpeaking();
    setOffset(Math.max(-MAX_BACK, Math.min(MAX_AHEAD, next)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-amber-200 dark:border-amber-900 bg-[#f6efdc] dark:bg-stone-900"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t("vocabulary.dailyWord.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("vocabulary.dailyWord.cardHint")}
        </DialogDescription>

        <div className="px-4 pt-5 pb-2 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => go(offset - 1)}
              disabled={offset <= -MAX_BACK}
              aria-label={t("vocabulary.dailyWord.prevDay")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1 font-semibold text-orange-500">
                <Flame className="h-4 w-4" />
                {t("vocabulary.dailyWord.streak", { count: streak.current })}
              </span>
              <span className="text-muted-foreground">
                {t("vocabulary.dailyWord.best", { count: streak.best })}
              </span>
              <span className="text-muted-foreground">
                {t("vocabulary.dailyWord.total", { count: learnedCount })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => go(offset + 1)}
              disabled={offset >= MAX_AHEAD}
              aria-label={t("vocabulary.dailyWord.nextDay")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {strip.map((k) => {
              const isLearned = !!days[k]?.learnedAt;
              const o = diffDays(todayKey, k);
              const disabled = o < -MAX_BACK || o > MAX_AHEAD;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={() => go(o)}
                  className={cn(
                    "flex flex-col items-center w-9 sm:w-11 rounded-md py-1 text-[11px] transition-colors disabled:opacity-40",
                    k === dayKey ? "bg-emerald-700 text-white" : "hover:bg-black/5 dark:hover:bg-white/10",
                    k === todayKey && k !== dayKey && "ring-1 ring-emerald-600"
                  )}
                >
                  <span className="opacity-70">
                    {parseDayKey(k).toLocaleDateString(locale, { weekday: "narrow" })}
                  </span>
                  <span className="font-semibold">{parseDayKey(k).getDate()}</span>
                  <span className="h-3 flex items-center">
                    {isLearned ? (
                      <Check className={cn("h-3 w-3", k === dayKey ? "text-white" : "text-green-600")} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current opacity-30" />
                    )}
                  </span>
                </button>
              );
            })}
            {offset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => go(0)} className="ml-1">
                {t("vocabulary.dailyWord.backToToday")}
              </Button>
            )}
          </div>
        </div>

        {!entry ? null : (
          <div className="px-3 pb-5 sm:px-6">
            <div className="rounded-xl border border-amber-300/60 dark:border-amber-800 bg-[#fbf5e4] dark:bg-stone-800 shadow-lg grid md:grid-cols-2 overflow-hidden">
              {/* Front page */}
              <div className="p-4 sm:p-6 md:border-r border-amber-300/60 dark:border-amber-800 text-emerald-950 dark:text-emerald-100">
                <div className="flex items-baseline justify-between text-sm font-serif">
                  <span>{date.getFullYear()}</span>
                  <span className="font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{month}</span>
                  <span>{weekday}</span>
                </div>
                <div className="relative flex items-end justify-center gap-3 mt-1">
                  <div className="text-8xl sm:text-9xl font-black leading-none text-emerald-900 dark:text-emerald-400">
                    {date.getDate()}
                  </div>
                  <IllustrationSlot
                    src={images[imageStoreKey(entry.word, "mascot")]}
                    status={imageStatus[imageStoreKey(entry.word, "mascot")]}
                    fallback={content?.mascot ?? "📖"}
                    className="h-24 w-24 sm:h-32 sm:w-32 shrink-0"
                    emojiClassName="text-5xl sm:text-6xl"
                  />
                </div>

                <div className="mt-2 rounded-lg border-2 border-emerald-900/70 dark:border-emerald-500/60 p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-4xl font-bold font-serif break-words">{entry.word}</h2>
                    <button
                      type="button"
                      onClick={() => speak(entry.word)}
                      aria-label={t("vocabulary.dailyWord.listen")}
                      className="rounded-full p-1.5 hover:bg-emerald-900/10"
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="text-sm italic mt-0.5">
                    {entry.syllabification && <span className="mr-2 not-italic opacity-70">{entry.syllabification}</span>}
                    <b>{content?.partOfSpeech || entry.partOfSpeech}</b>{" "}
                    {content?.meaningZh || entry.chineseDefinition}
                  </div>
                  {entry.englishDefinition && (
                    <div className="text-xs opacity-80 mt-1">{entry.englishDefinition}</div>
                  )}
                  {content && (
                    <div className="mt-2 pt-2 border-t border-emerald-900/20 text-sm text-left">
                      <button type="button" className="text-left" onClick={() => speak(content.example)}>
                        {content.example}
                      </button>
                      <div className="opacity-80">{content.exampleZh}</div>
                    </div>
                  )}
                </div>

                {content && content.collocations.length > 0 && (
                  <PageBox title={t("vocabulary.dailyWord.expand")}>
                    <ul className="text-sm divide-y divide-emerald-900/15">
                      {content.collocations.map((c) => (
                        <li key={c.phrase} className="flex justify-between gap-2 py-0.5">
                          <span>• {c.phrase}</span>
                          <span className="opacity-80 text-right">{c.zh}</span>
                        </li>
                      ))}
                    </ul>
                  </PageBox>
                )}
              </div>

              {/* Back page */}
              <div className="p-4 sm:p-6 space-y-3 text-emerald-950 dark:text-emerald-100 border-t md:border-t-0 border-amber-300/60 dark:border-amber-800">
                {content ? (
                  <>
                    <div className="rounded-lg border-2 border-emerald-900/70 dark:border-emerald-500/60 p-3">
                      <div className="text-sm">{content.quoteZh}</div>
                      <div className="text-sm italic font-serif mt-1 border-t border-emerald-900/20 pt-1">
                        {content.quote}
                      </div>
                      <div className="mt-2 text-center">
                        <IllustrationSlot
                          src={images[imageStoreKey(entry.word, "scene")]}
                          status={imageStatus[imageStoreKey(entry.word, "scene")]}
                          fallback={content.scene.join(" ")}
                          className="w-full aspect-video"
                          emojiClassName="text-3xl tracking-widest"
                          onRetry={() => {
                            useDailyWordStore.setState((st) => {
                              const imageStatus = { ...st.imageStatus };
                              delete imageStatus[imageStoreKey(entry.word, "scene")];
                              return { imageStatus };
                            });
                            void ensureImage(entry.word, "scene");
                          }}
                        />
                        {content.sceneCaption && (
                          <div className="text-xs opacity-70 mt-1">{content.sceneCaption}</div>
                        )}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {content.decode.length > 0 && (
                        <PageBox title={t("vocabulary.dailyWord.decode")}>
                          <ul className="text-xs space-y-1">
                            {content.decode.map((d) => (
                              <li key={d}>• {d}</li>
                            ))}
                          </ul>
                        </PageBox>
                      )}
                      <div className="space-y-3">
                        {content.family.length > 0 && (
                          <PageBox title={t("vocabulary.dailyWord.family")}>
                            <RelatedList items={content.family} onSpeak={speak} />
                          </PageBox>
                        )}
                        {content.associations.length > 0 && (
                          <PageBox title={t("vocabulary.dailyWord.associations")}>
                            <RelatedList items={content.associations} onSpeak={speak} />
                          </PageBox>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    {loading ? (
                      <>
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                        {t("vocabulary.dailyWord.preparing")}
                      </>
                    ) : (
                      <>
                        <p className="mb-3">{error ?? t("vocabulary.dailyWord.failed")}</p>
                        <Button variant="outline" size="sm" onClick={() => setRetry((n) => n + 1)}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {t("vocabulary.dailyWord.retry")}
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <PageBox title={t("vocabulary.dailyWord.writeTitle")}>
                  <Textarea
                    {...NO_ASSIST}
                    {...({ writingsuggestions: "false" } as object)}
                    value={days[dayKey]?.note ?? ""}
                    onChange={(e) => setNote(dayKey, entry.word, e.target.value.slice(0, 500))}
                    placeholder={t("vocabulary.dailyWord.writePlaceholder", { word: entry.word })}
                    rows={2}
                    className="bg-transparent text-sm"
                  />
                </PageBox>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1">
              {learned ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                  <Check className="h-5 w-5" />
                  {t("vocabulary.dailyWord.learnedDone")}
                  {!learned.onTime && (
                    <span className="text-xs font-normal opacity-80">
                      ({t("vocabulary.dailyWord.bonus")})
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleLearned}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t(`vocabulary.dailyWord.learnBtn.${kind}`)}
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {t(`vocabulary.dailyWord.hint.${kind}`)}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IllustrationSlot({
  src,
  status,
  fallback,
  className,
  emojiClassName,
  onRetry,
}: {
  src?: string;
  status?: "loading" | "failed";
  fallback: string;
  className?: string;
  emojiClassName?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full object-contain animate-in fade-in duration-500"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg select-none",
        status === "loading" && "animate-pulse bg-emerald-900/5",
        className
      )}
      aria-busy={status === "loading"}
    >
      <span className={emojiClassName} aria-hidden>
        {fallback}
      </span>
      {status === "loading" && (
        <span className="mt-1 text-[10px] opacity-60 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("vocabulary.dailyWord.drawing")}
        </span>
      )}
      {status === "failed" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 text-[10px] underline opacity-70 hover:opacity-100"
        >
          {t("vocabulary.dailyWord.drawRetry")}
        </button>
      )}
    </div>
  );
}

function PageBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0 rounded-lg border border-emerald-900/50 dark:border-emerald-500/40 p-2.5">
      <div className="inline-block rounded-full bg-emerald-800 text-white text-xs font-semibold px-2.5 py-0.5 mb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function RelatedList({
  items,
  onSpeak,
}: {
  items: { word: string; pos: string; zh: string }[];
  onSpeak: (text: string) => void;
}) {
  return (
    <ul className="text-xs space-y-0.5">
      {items.map((r) => (
        <li key={r.word} className="flex justify-between gap-2">
          <button type="button" className="font-semibold hover:underline" onClick={() => onSpeak(r.word)}>
            {r.word}
          </button>
          <span className="opacity-80 text-right">
            <i>{r.pos}</i> {r.zh}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default DailyWordCard;
